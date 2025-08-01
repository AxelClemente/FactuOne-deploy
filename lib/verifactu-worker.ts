import { eq, and, lt, gte } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/app/db/schema'
import { VerifactuService } from './verifactu-service'
import { VerifactuXmlGenerator } from './verifactu-xml-generator'
import { VerifactuSoapClient, VerifactuSoapConfigFactory } from './verifactu-soap-client'
import { VerifactuSigner } from './verifactu-signer'

/**
 * Worker para procesamiento automático de registros VERI*FACTU
 * 
 * Maneja el envío automático de registros pendientes respetando:
 * - Control de flujo AEAT (60 segundos mínimo entre envíos)
 * - Gestión de reintentos para errores
 * - Procesamiento por lotes
 * - Estados de transmisión
 */

interface ProcessingResult {
  processed: number
  successful: number
  failed: number
  errors: string[]
  lastProcessedAt: Date
}

interface WorkerConfig {
  batchSize: number // Registros a procesar por lote
  flowControlDelay: number // Segundos entre envíos (mínimo 60)
  maxRetries: number // Reintentos máximos
  retryDelay: number // Segundos antes de reintentar
}

const DEFAULT_CONFIG: WorkerConfig = {
  batchSize: 10,
  flowControlDelay: 60, // 60 segundos según especificaciones AEAT
  maxRetries: 3,
  retryDelay: 300 // 5 minutos
}

export class VerifactuWorker {
  
  /**
   * Procesa la cola de registros pendientes para un negocio
   */
  static async processBusinessQueue(
    businessId: string, 
    config: Partial<WorkerConfig> = {}
  ): Promise<ProcessingResult> {
    const workerConfig = { ...DEFAULT_CONFIG, ...config }
    const result: ProcessingResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      lastProcessedAt: new Date()
    }
    
    try {
      // 1. Obtener configuración VERI*FACTU del negocio
      const verifactuConfig = await VerifactuService.getConfig(businessId)
      if (!verifactuConfig?.enabled) {
        return result // No procesar si no está habilitado
      }
      
      // 2. Verificar control de flujo
      const canProcess = await this.checkFlowControl(businessId, workerConfig.flowControlDelay)
      if (!canProcess) {
        return result // Esperar más tiempo antes del próximo envío
      }
      
      // 3. Obtener registros pendientes
      const pendingRegistries = await this.getPendingRegistries(businessId, workerConfig.batchSize)
      
      // 4. Procesar cada registro
      for (const registry of pendingRegistries) {
        try {
          await this.processRegistry(registry, verifactuConfig)
          result.successful++
        } catch (error) {
          result.failed++
          result.errors.push(`Registry ${registry.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
          
          // Marcar como error si supera reintentos máximos
          if (registry.retryCount >= workerConfig.maxRetries) {
            await VerifactuService.markAsError(
              registry.id, 
              `Máximo de reintentos alcanzado: ${error instanceof Error ? error.message : 'Error desconocido'}`
            )
          }
        }
        
        result.processed++
        
        // Respetar control de flujo entre registros
        if (result.processed < pendingRegistries.length) {
          await this.delay(workerConfig.flowControlDelay * 1000)
        }
      }
      
      return result
      
    } catch (error) {
      result.errors.push(`Error general del worker: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return result
    }
  }
  
  /**
   * Procesa todos los negocios con VERI*FACTU habilitado
   */
  static async processAllBusinesses(config: Partial<WorkerConfig> = {}): Promise<Map<string, ProcessingResult>> {
    const results = new Map<string, ProcessingResult>()
    
    try {
      // Obtener todos los negocios con VERI*FACTU habilitado
      const db = await getDb()
      const enabledBusinesses = await db
        .select()
        .from(schema.verifactuConfig)
        .where(eq(schema.verifactuConfig.enabled, true))
      
      // Procesar cada negocio
      for (const business of enabledBusinesses) {
        const result = await this.processBusinessQueue(business.businessId, config)
        results.set(business.businessId, result)
        
        // Pequeña pausa entre negocios
        await this.delay(5000) // 5 segundos
      }
      
    } catch (error) {
      console.error('Error procesando todos los negocios:', error)
    }
    
    return results
  }
  
  /**
   * Procesa registros que requieren reintento
   */
  static async processRetries(businessId: string): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      lastProcessedAt: new Date()
    }
    
    try {
      const retryableRegistries = await VerifactuService.getRetryableRegistries(businessId)
      const verifactuConfig = await VerifactuService.getConfig(businessId)
      
      if (!verifactuConfig?.enabled) {
        return result
      }
      
      for (const registry of retryableRegistries) {
        try {
          await this.processRegistry(registry, verifactuConfig)
          result.successful++
        } catch (error) {
          result.failed++
          result.errors.push(`Retry ${registry.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
        
        result.processed++
        
        // Control de flujo en reintentos
        if (result.processed < retryableRegistries.length) {
          await this.delay(60000) // 60 segundos
        }
      }
      
    } catch (error) {
      result.errors.push(`Error procesando reintentos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
    
    return result
  }
  
  /**
   * Procesa un registro individual
   */
  private static async processRegistry(
    registry: any,
    config: any
  ): Promise<void> {
    let certificatePath: string | undefined
    let isTemporaryCert = false
    
    try {
      // 1. Obtener datos completos del registro
      const fullRegistry = await this.getFullRegistryData(registry.id)
      if (!fullRegistry) {
        throw new Error('No se pudieron obtener los datos completos del registro')
      }
      
      // 2. Generar XML según esquemas AEAT
      const xmlContent = VerifactuXmlGenerator.generateRegistrationXML(
        fullRegistry.registry,
        config,
        fullRegistry.business,
        fullRegistry.invoice,
        fullRegistry.contraparte
      )
      
      // 3. Obtener certificado si es necesario
      let certificatePassword: string | undefined
      
      if (config.environment === 'production' || (config.environment === 'testing' && config.certificatePath)) {
        certificatePath = config.certificatePath
        certificatePassword = config.certificatePasswordEncrypted
        
        // Si es una URL de blob, descargar temporalmente
        if (certificatePath?.includes('blob.vercel-storage.com')) {
          const tempPath = `/tmp/cert_${fullRegistry.business.id}_${Date.now()}.p12`
          
          const response = await fetch(certificatePath)
          if (!response.ok) {
            throw new Error('No se pudo descargar el certificado desde el almacenamiento')
          }
          
          const fs = require('fs').promises
          const certificateBuffer = await response.arrayBuffer()
          await fs.writeFile(tempPath, Buffer.from(certificateBuffer))
          
          certificatePath = tempPath
          isTemporaryCert = true
          console.log('📥 Certificado descargado temporalmente:', tempPath)
        }
        
        if (!certificatePath) {
          throw new Error('No hay certificado configurado para firma digital')
        }
      }
      
      // 4. Firmar XML si es necesario
      let finalXml = xmlContent
      if (certificatePath && certificatePassword) {
        const signResult = await VerifactuSigner.signXML(
          xmlContent,
          certificatePath,
          certificatePassword
        )
        
        if (!signResult.success) {
          throw new Error(`Error firmando XML: ${signResult.errorMessage}`)
        }
        
        finalXml = signResult.signedXml!
      }
      
      // 5. Configurar cliente SOAP con certificado
      const soapConfig = config.environment === 'production' 
        ? VerifactuSoapConfigFactory.production(
            certificatePath!,
            certificatePassword!,
            config.useSello
          )
        : VerifactuSoapConfigFactory.testing(config.useSello)
      
      // 6. Enviar a AEAT
      const submitResult = await VerifactuSoapClient.submitRegistry(finalXml, soapConfig)
      
      if (submitResult.success) {
        // Marcar como enviado exitosamente
        await VerifactuService.markAsSent(
          registry.id,
          submitResult.rawResponse || '',
          submitResult.csv || ''
        )
        
        // Registrar evento de éxito
        await this.logEvent(registry.businessId, 'registry_sent', {
          registryId: registry.id,
          csv: submitResult.csv,
          success: true
        })
      } else {
        // Incrementar contador de reintentos
        const db = await getDb()
        await db
          .update(schema.verifactuRegistry)
          .set({
            retryCount: registry.retryCount + 1,
            lastError: submitResult.errorMessage,
            updatedAt: new Date()
          })
          .where(eq(schema.verifactuRegistry.id, registry.id))
        
        // Registrar evento de error
        await this.logEvent(registry.businessId, 'registry_error', {
          registryId: registry.id,
          error: submitResult.errorMessage,
          errorCode: submitResult.errorCode,
          retryCount: registry.retryCount + 1
        })
        
        throw new Error(submitResult.errorMessage || 'Error enviando a AEAT')
      }
      
    } catch (error) {
      // Incrementar contador de reintentos en caso de excepción
      const db = await getDb()
      await db
        .update(schema.verifactuRegistry)
        .set({
          retryCount: registry.retryCount + 1,
          lastError: error instanceof Error ? error.message : 'Error desconocido',
          updatedAt: new Date()
        })
        .where(eq(schema.verifactuRegistry.id, registry.id))
      
      throw error
    } finally {
      // Limpiar certificado temporal si fue descargado
      if (isTemporaryCert && certificatePath) {
        try {
          const fs = require('fs').promises
          await fs.unlink(certificatePath)
          console.log('🗑️ Certificado temporal eliminado:', certificatePath)
        } catch (cleanupError) {
          console.warn('⚠️ No se pudo eliminar certificado temporal:', cleanupError)
        }
      }
    }
  }
  
  /**
   * Verifica el control de flujo antes de procesar
   */
  private static async checkFlowControl(businessId: string, delaySeconds: number): Promise<boolean> {
    try {
      const lastSent = await db
        .select()
        .from(schema.verifactuRegistry)
        .where(
          and(
            eq(schema.verifactuRegistry.businessId, businessId),
            eq(schema.verifactuRegistry.status, 'sent')
          )
        )
        .orderBy(schema.verifactuRegistry.sentAt)
        .limit(1)
      
      if (lastSent.length === 0) {
        return true // No hay envíos previos
      }
      
      const lastSentTime = lastSent[0].sentAt
      if (!lastSentTime) {
        return true
      }
      
      const now = new Date()
      const timeDiff = (now.getTime() - lastSentTime.getTime()) / 1000
      
      return timeDiff >= delaySeconds
      
    } catch (error) {
      console.error('Error verificando control de flujo:', error)
      return false // Ser conservador en caso de error
    }
  }
  
  /**
   * Obtiene registros pendientes para procesar
   */
  private static async getPendingRegistries(businessId: string, limit: number) {
    return await db
      .select()
      .from(schema.verifactuRegistry)
      .where(
        and(
          eq(schema.verifactuRegistry.businessId, businessId),
          eq(schema.verifactuRegistry.status, 'pending')
        )
      )
      .orderBy(schema.verifactuRegistry.createdAt)
      .limit(limit)
  }
  
  /**
   * Obtiene datos completos de un registro para procesamiento
   */
  private static async getFullRegistryData(registryId: string) {
    try {
      // Obtener el registro
      const registry = await db
        .select()
        .from(schema.verifactuRegistry)
        .where(eq(schema.verifactuRegistry.id, registryId))
        .limit(1)
      
      if (registry.length === 0) {
        return null
      }
      
      const reg = registry[0]
      
      // Obtener datos del negocio
      const business = await db
        .select()
        .from(schema.businesses)
        .where(eq(schema.businesses.id, reg.businessId))
        .limit(1)
      
      // Obtener datos de la factura según el tipo
      let invoice, contraparte
      
      if (reg.invoiceType === 'sent') {
        // Factura emitida
        const invoiceData = await db
          .select()
          .from(schema.invoices)
          .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
          .where(eq(schema.invoices.id, reg.invoiceId))
          .limit(1)
        
        if (invoiceData.length > 0) {
          invoice = invoiceData[0].invoices
          contraparte = invoiceData[0].clients
        }
      } else {
        // Factura recibida
        const invoiceData = await db
          .select()
          .from(schema.receivedInvoices)
          .leftJoin(schema.providers, eq(schema.receivedInvoices.providerId, schema.providers.id))
          .where(eq(schema.receivedInvoices.id, reg.invoiceId))
          .limit(1)
        
        if (invoiceData.length > 0) {
          invoice = invoiceData[0].received_invoices
          contraparte = invoiceData[0].providers
        }
      }
      
      if (!business[0] || !invoice || !contraparte) {
        return null
      }
      
      return {
        registry: reg,
        business: business[0],
        invoice,
        contraparte
      }
      
    } catch (error) {
      console.error('Error obteniendo datos completos del registro:', error)
      return null
    }
  }
  
  /**
   * Registra un evento en el log de auditoría
   */
  private static async logEvent(businessId: string, eventType: string, eventData: any) {
    try {
      await db.insert(schema.verifactuEvents).values({
        id: crypto.randomUUID(),
        businessId,
        eventType,
        eventData: JSON.stringify(eventData),
        createdAt: new Date()
      })
    } catch (error) {
      console.error('Error registrando evento:', error)
    }
  }
  
  /**
   * Utilidad para pausas con Promise
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * Obtiene estadísticas del worker
   */
  static async getWorkerStats(businessId: string): Promise<{
    pendingCount: number
    processingCount: number
    sentCount: number
    errorCount: number
    lastProcessedAt?: Date
    nextProcessingEligible?: Date
  }> {
    try {
      const stats = await db
        .select({
          status: schema.verifactuRegistry.status,
          count: db.$count()
        })
        .from(schema.verifactuRegistry)
        .where(eq(schema.verifactuRegistry.businessId, businessId))
        .groupBy(schema.verifactuRegistry.status)
      
      const statusCounts = stats.reduce((acc, stat) => {
        acc[stat.status] = stat.count
        return acc
      }, {} as Record<string, number>)
      
      // Último procesado
      const lastSent = await db
        .select()
        .from(schema.verifactuRegistry)
        .where(
          and(
            eq(schema.verifactuRegistry.businessId, businessId),
            eq(schema.verifactuRegistry.status, 'sent')
          )
        )
        .orderBy(schema.verifactuRegistry.sentAt)
        .limit(1)
      
      const lastProcessedAt = lastSent[0]?.sentAt
      const nextProcessingEligible = lastProcessedAt 
        ? new Date(lastProcessedAt.getTime() + (60 * 1000)) // 60 segundos después
        : new Date()
      
      return {
        pendingCount: statusCounts.pending || 0,
        processingCount: statusCounts.processing || 0,
        sentCount: statusCounts.sent || 0,
        errorCount: statusCounts.error || 0,
        lastProcessedAt,
        nextProcessingEligible
      }
      
    } catch (error) {
      console.error('Error obteniendo estadísticas del worker:', error)
      return {
        pendingCount: 0,
        processingCount: 0,
        sentCount: 0,
        errorCount: 0
      }
    }
  }
  
  /**
   * Limpia registros antiguos según política de retención
   */
  static async cleanupOldRegistries(
    businessId: string, 
    retentionDays: number = 365
  ): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      const deleted = await db
        .delete(schema.verifactuRegistry)
        .where(
          and(
            eq(schema.verifactuRegistry.businessId, businessId),
            lt(schema.verifactuRegistry.createdAt, cutoffDate),
            eq(schema.verifactuRegistry.status, 'sent') // Solo eliminar los enviados exitosamente
          )
        )
      
      return deleted.rowsAffected || 0
      
    } catch (error) {
      console.error('Error limpiando registros antiguos:', error)
      return 0
    }
  }
}

/**
 * Configuraciones predefinidas del worker
 */
export class VerifactuWorkerConfigFactory {
  
  /**
   * Configuración para testing
   */
  static testing(): WorkerConfig {
    return {
      batchSize: 5,
      flowControlDelay: 10, // Reducido para testing
      maxRetries: 2,
      retryDelay: 60 // 1 minuto
    }
  }
  
  /**
   * Configuración para producción
   */
  static production(): WorkerConfig {
    return {
      batchSize: 10,
      flowControlDelay: 60, // Obligatorio por AEAT
      maxRetries: 3,
      retryDelay: 300 // 5 minutos
    }
  }
  
  /**
   * Configuración para alto volumen
   */
  static highVolume(): WorkerConfig {
    return {
      batchSize: 20,
      flowControlDelay: 60,
      maxRetries: 5,
      retryDelay: 600 // 10 minutos
    }
  }
}