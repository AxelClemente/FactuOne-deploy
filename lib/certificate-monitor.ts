import { getDb } from '@/lib/db'
import { verifactuConfig, notifications } from '@/app/db/schema'
import { eq, and, lte, isNotNull } from 'drizzle-orm'
import { CertificateManager } from './certificate-manager'
import { v4 as uuidv4 } from 'uuid'

/**
 * Monitor de certificados VERI*FACTU
 * 
 * Se encarga de:
 * - Verificar periódicamente el estado de los certificados
 * - Crear notificaciones cuando están próximos a expirar
 * - Alertar sobre certificados expirados
 */

interface CertificateStatus {
  businessId: string
  businessName: string
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiration: number
  validUntil: Date | null
}

export class CertificateMonitor {
  
  /**
   * Verifica todos los certificados y crea notificaciones si es necesario
   */
  static async checkAllCertificates(): Promise<CertificateStatus[]> {
    const db = await getDb()
    const results: CertificateStatus[] = []
    
    try {
      // Obtener todas las configuraciones con certificados
      const configs = await db
        .select({
          config: verifactuConfig,
          businessName: db.$sql<string>`(SELECT name FROM businesses WHERE id = ${verifactuConfig.businessId})`
        })
        .from(verifactuConfig)
        .where(
          and(
            eq(verifactuConfig.enabled, true),
            isNotNull(verifactuConfig.certificatePath)
          )
        )
      
      // Verificar cada certificado
      for (const { config, businessName } of configs) {
        const status = await this.checkBusinessCertificate(
          config.businessId,
          businessName || 'Negocio'
        )
        
        if (status) {
          results.push(status)
          
          // Crear notificación si es necesario
          await this.createNotificationIfNeeded(status)
        }
      }
      
      return results
      
    } catch (error) {
      console.error('Error verificando certificados:', error)
      return results
    }
  }
  
  /**
   * Verifica el certificado de un negocio específico
   */
  static async checkBusinessCertificate(
    businessId: string,
    businessName: string
  ): Promise<CertificateStatus | null> {
    try {
      const expirationInfo = await CertificateManager.checkCertificateExpiration(businessId)
      const certInfo = await CertificateManager.getCertificateInfo(businessId)
      
      return {
        businessId,
        businessName,
        isExpired: expirationInfo.isExpired,
        isExpiringSoon: expirationInfo.isExpiringSoon,
        daysUntilExpiration: expirationInfo.daysUntilExpiration,
        validUntil: certInfo?.validTo || null
      }
      
    } catch (error) {
      console.error(`Error verificando certificado para negocio ${businessId}:`, error)
      return null
    }
  }
  
  /**
   * Crea notificación si el certificado está expirado o próximo a expirar
   */
  private static async createNotificationIfNeeded(status: CertificateStatus): Promise<void> {
    const db = await getDb()
    
    try {
      let title = ''
      let message = ''
      let type: 'error' | 'warning' = 'warning'
      
      if (status.isExpired) {
        title = '🚨 Certificado VERI*FACTU Expirado'
        message = `El certificado digital de ${status.businessName} ha expirado. No se pueden enviar facturas a VERI*FACTU hasta que se actualice.`
        type = 'error'
      } else if (status.isExpiringSoon) {
        if (status.daysUntilExpiration <= 7) {
          title = '⚠️ Certificado expira en menos de una semana'
          message = `El certificado digital de ${status.businessName} expira en ${status.daysUntilExpiration} días. Es urgente renovarlo.`
          type = 'error'
        } else {
          title = '📅 Certificado próximo a expirar'
          message = `El certificado digital de ${status.businessName} expira en ${status.daysUntilExpiration} días. Recuerde renovarlo a tiempo.`
        }
      } else {
        return // No crear notificación si no hay problemas
      }
      
      // Verificar si ya existe una notificación similar reciente (últimas 24h)
      const existingNotifications = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.business_id, status.businessId),
            eq(notifications.title, title),
            db.$gte(notifications.created_at, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        )
        .limit(1)
      
      if (existingNotifications.length === 0) {
        // Crear nueva notificación
        await db.insert(notifications).values({
          id: uuidv4(),
          business_id: status.businessId,
          type,
          title,
          message,
          is_read: false,
          action_url: '/verifactu',
          created_at: new Date()
        })
        
        console.log(`📢 Notificación creada para ${status.businessName}: ${title}`)
      }
      
    } catch (error) {
      console.error('Error creando notificación:', error)
    }
  }
  
  /**
   * Obtiene un resumen del estado de certificados para el dashboard
   */
  static async getCertificateSummary(): Promise<{
    total: number
    expired: number
    expiringSoon: number
    healthy: number
  }> {
    const statuses = await this.checkAllCertificates()
    
    return {
      total: statuses.length,
      expired: statuses.filter(s => s.isExpired).length,
      expiringSoon: statuses.filter(s => s.isExpiringSoon && !s.isExpired).length,
      healthy: statuses.filter(s => !s.isExpired && !s.isExpiringSoon).length
    }
  }
  
  /**
   * Limpia notificaciones antiguas de certificados
   */
  static async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const db = await getDb()
    
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
      
      const result = await db
        .delete(notifications)
        .where(
          and(
            db.$like(notifications.title, '%Certificado%'),
            db.$lt(notifications.created_at, cutoffDate),
            eq(notifications.is_read, true)
          )
        )
      
      return result.rowsAffected || 0
      
    } catch (error) {
      console.error('Error limpiando notificaciones antiguas:', error)
      return 0
    }
  }
}

/**
 * Función helper para ejecutar el monitor periódicamente
 * Puede ser llamada desde un cron job o worker
 */
export async function runCertificateMonitor(): Promise<void> {
  console.log('🔍 Iniciando verificación de certificados VERI*FACTU...')
  
  try {
    const results = await CertificateMonitor.checkAllCertificates()
    
    const expired = results.filter(r => r.isExpired).length
    const expiringSoon = results.filter(r => r.isExpiringSoon && !r.isExpired).length
    
    console.log(`✅ Verificación completada:`)
    console.log(`   - Total certificados: ${results.length}`)
    console.log(`   - Expirados: ${expired}`)
    console.log(`   - Próximos a expirar: ${expiringSoon}`)
    
    // Limpiar notificaciones antiguas
    const cleaned = await CertificateMonitor.cleanupOldNotifications()
    if (cleaned > 0) {
      console.log(`🗑️ ${cleaned} notificaciones antiguas eliminadas`)
    }
    
  } catch (error) {
    console.error('❌ Error en monitor de certificados:', error)
  }
}