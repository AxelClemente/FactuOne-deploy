import { getDb } from './db'
import { 
  verifactuRegistry, 
  verifactuConfig, 
  verifactuEvents, 
  invoices,
  receivedInvoices,
  businesses,
  clients,
  providers,
  NewVerifactuRegistry,
  NewVerifactuEvent
} from '@/app/db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { generateVerifactuHash, formatAmountForVerifactu, formatDateForVerifactu } from './verifactu-hash'
import { generateQRDataURL } from './verifactu-qr'

interface CreateRegistryParams {
  invoiceId: string
  invoiceType: 'sent' | 'received'
  businessId: string
}

/**
 * Servicio para gestionar registros VERI*FACTU
 */
export class VerifactuService {
  /**
   * Obtiene la configuración VERI*FACTU de un negocio
   */
  static async getConfig(businessId: string) {
    const db = await getDb()
    const [config] = await db
      .select()
      .from(verifactuConfig)
      .where(eq(verifactuConfig.businessId, businessId))
    
    return config
  }

  /**
   * Crea o actualiza la configuración VERI*FACTU de un negocio
   */
  static async upsertConfig(businessId: string, config: Partial<typeof verifactuConfig.$inferInsert>) {
    const db = await getDb()
    const existingConfig = await this.getConfig(businessId)
    
    if (existingConfig) {
      await db
        .update(verifactuConfig)
        .set(config)
        .where(eq(verifactuConfig.businessId, businessId))
    } else {
      await db.insert(verifactuConfig).values({
        id: uuidv4(),
        businessId,
        ...config
      })
    }
  }

  /**
   * Obtiene el último registro VERI*FACTU de un negocio
   */
  static async getLastRegistry(businessId: string) {
    const db = await getDb()
    const [lastRegistry] = await db
      .select()
      .from(verifactuRegistry)
      .where(eq(verifactuRegistry.businessId, businessId))
      .orderBy(desc(verifactuRegistry.sequenceNumber))
      .limit(1)
    
    return lastRegistry
  }

  /**
   * Crea un nuevo registro VERI*FACTU para una factura
   */
  static async createRegistry({ invoiceId, invoiceType, businessId }: CreateRegistryParams) {
    const db = await getDb()
    
    // Obtener configuración
    const config = await this.getConfig(businessId)
    if (!config || !config.enabled) {
      throw new Error('VERI*FACTU no está habilitado para este negocio')
    }

    // Obtener datos de la factura
    let invoiceData: any
    let clientOrProvider: any
    let business: any

    if (invoiceType === 'sent') {
      // Factura emitida
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
      
      if (!invoice) throw new Error('Factura no encontrada')
      
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
      
      const [businessData] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
      
      invoiceData = invoice
      clientOrProvider = client
      business = businessData
    } else {
      // Factura recibida
      const [receivedInvoice] = await db
        .select()
        .from(receivedInvoices)
        .where(eq(receivedInvoices.id, invoiceId))
      
      if (!receivedInvoice) throw new Error('Factura recibida no encontrada')
      
      const [provider] = await db
        .select()
        .from(providers)
        .where(eq(providers.id, receivedInvoice.providerId!))
      
      const [businessData] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
      
      invoiceData = receivedInvoice
      clientOrProvider = provider
      business = businessData
    }

    // Obtener último registro para el hash anterior
    const lastRegistry = await this.getLastRegistry(businessId)
    const sequenceNumber = lastRegistry ? lastRegistry.sequenceNumber + 1 : 1

    // Generar hash
    const hashData = {
      businessNIF: invoiceType === 'sent' ? business.nif : clientOrProvider.nif,
      invoiceNumber: invoiceData.number,
      invoiceDate: formatDateForVerifactu(invoiceData.date),
      clientNIF: invoiceType === 'sent' ? clientOrProvider.nif : business.nif,
      total: formatAmountForVerifactu(invoiceData.total),
      previousHash: lastRegistry?.currentHash || undefined
    }
    
    const currentHash = generateVerifactuHash(hashData)

    // Generar QR
    const qrDataUrl = await generateQRDataURL({
      businessNIF: hashData.businessNIF,
      invoiceNumber: invoiceData.number,
      invoiceDate: formatDateForVerifactu(invoiceData.date),
      total: invoiceData.total.toString(),
      hash: currentHash
    }, config.mode === 'verifactu')

    // Generar URL del QR
    const qrUrl = `https://www2.agenciatributaria.gob.es/es13/h/qr?nif=${hashData.businessNIF}&numserie=${invoiceData.number}&fecha=${formatDateForVerifactu(invoiceData.date)}&importe=${invoiceData.total}&hash=${currentHash.substring(0, 8)}&ver=${config.mode === 'verifactu' ? '1' : '0'}`

    // TODO: Generar XML completo para AEAT (esto requiere más implementación)
    const xmlContent = '<placeholder>XML content will be generated here</placeholder>'

    // Crear registro
    const registryId = uuidv4()
    const newRegistry: NewVerifactuRegistry = {
      id: registryId,
      businessId,
      invoiceId,
      invoiceType,
      sequenceNumber,
      previousHash: lastRegistry?.currentHash || null,
      currentHash,
      qrCode: qrDataUrl,
      qrUrl,
      xmlContent,
      signedXml: null,
      transmissionStatus: 'pending',
      transmissionDate: null,
      aeatResponse: null,
      aeatCsv: null,
      errorMessage: null,
      retryCount: 0,
      nextRetryAt: null,
      isVerifiable: config.mode === 'verifactu'
    }

    await db.insert(verifactuRegistry).values(newRegistry)

    // Actualizar número de secuencia en configuración
    await db
      .update(verifactuConfig)
      .set({ lastSequenceNumber: sequenceNumber })
      .where(eq(verifactuConfig.businessId, businessId))

    // Registrar evento
    await this.createEvent(businessId, 'created', {
      invoiceId,
      invoiceType,
      sequenceNumber,
      hash: currentHash
    }, registryId)

    return newRegistry
  }

  /**
   * Registra un evento en el sistema VERI*FACTU
   */
  static async createEvent(businessId: string, eventType: string, eventData?: any, registryId?: string) {
    const db = await getDb()
    
    const event: NewVerifactuEvent = {
      id: uuidv4(),
      businessId,
      registryId: registryId || null,
      eventType,
      eventData: eventData ? JSON.stringify(eventData) : null
    }

    await db.insert(verifactuEvents).values(event)
  }

  /**
   * Obtiene el registro VERI*FACTU de una factura
   */
  static async getRegistryByInvoice(invoiceId: string, invoiceType: 'sent' | 'received') {
    const db = await getDb()
    const [registry] = await db
      .select()
      .from(verifactuRegistry)
      .where(
        and(
          eq(verifactuRegistry.invoiceId, invoiceId),
          eq(verifactuRegistry.invoiceType, invoiceType)
        )
      )
    
    return registry
  }

  /**
   * Marca un registro como enviado
   */
  static async markAsSent(registryId: string, aeatResponse: string, aeatCsv: string) {
    const db = await getDb()
    
    // Obtener el businessId del registro
    const [registry] = await db
      .select({ businessId: verifactuRegistry.businessId })
      .from(verifactuRegistry)
      .where(eq(verifactuRegistry.id, registryId))
    
    if (!registry) return
    
    await db
      .update(verifactuRegistry)
      .set({
        transmissionStatus: 'sent',
        transmissionDate: new Date(),
        aeatResponse,
        aeatCsv,
        errorMessage: null
      })
      .where(eq(verifactuRegistry.id, registryId))

    await this.createEvent(registry.businessId, 'sent', { aeatCsv }, registryId)
  }

  /**
   * Marca un registro con error
   */
  static async markAsError(registryId: string, errorMessage: string) {
    const db = await getDb()
    
    const [registry] = await db
      .select()
      .from(verifactuRegistry)
      .where(eq(verifactuRegistry.id, registryId))

    if (!registry) return

    const retryCount = registry.retryCount + 1
    const nextRetryAt = new Date(Date.now() + Math.min(retryCount * 60 * 1000, 3600 * 1000)) // Max 1 hora

    await db
      .update(verifactuRegistry)
      .set({
        transmissionStatus: 'error',
        errorMessage,
        retryCount,
        nextRetryAt
      })
      .where(eq(verifactuRegistry.id, registryId))

    await this.createEvent(registry.businessId, 'error', { errorMessage, retryCount }, registryId)
  }

  /**
   * Obtiene registros pendientes de envío
   */
  static async getPendingRegistries(businessId?: string) {
    const db = await getDb()
    
    let query = db
      .select()
      .from(verifactuRegistry)
      .where(
        and(
          eq(verifactuRegistry.transmissionStatus, 'pending'),
          businessId ? eq(verifactuRegistry.businessId, businessId) : undefined
        )
      )
      .orderBy(verifactuRegistry.sequenceNumber)
    
    return await query
  }

  /**
   * Obtiene registros con error listos para reintentar
   */
  static async getRetryableRegistries(businessId?: string) {
    const db = await getDb()
    
    let query = db
      .select()
      .from(verifactuRegistry)
      .where(
        and(
          eq(verifactuRegistry.transmissionStatus, 'error'),
          businessId ? eq(verifactuRegistry.businessId, businessId) : undefined,
          verifactuRegistry.nextRetryAt ? 
            eq(verifactuRegistry.nextRetryAt, new Date()) : 
            undefined
        )
      )
      .orderBy(verifactuRegistry.sequenceNumber)
    
    return await query
  }
}