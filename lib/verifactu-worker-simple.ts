import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/app/db/schema'

/**
 * Worker simplificado para VERI*FACTU - Solo para testing inicial
 */

interface WorkerStats {
  pendingCount: number
  processingCount: number
  sentCount: number
  errorCount: number
  lastProcessedAt?: Date
}

export class VerifactuWorkerSimple {
  
  /**
   * Obtiene estadísticas del worker para un negocio
   */
  static async getWorkerStats(businessId: string): Promise<WorkerStats> {
    console.log('📊 Worker Stats - Obteniendo estadísticas para:', businessId)
    
    try {
      const db = await getDb()
      
      // Contar registros por estado
      const registries = await db
        .select()
        .from(schema.verifactuRegistry)
        .where(eq(schema.verifactuRegistry.businessId, businessId))
      
      console.log('📋 Registros encontrados:', registries.length)
      
      // Contar por estado
      const pendingCount = registries.filter(r => r.transmissionStatus === 'pending').length
      const processingCount = registries.filter(r => r.transmissionStatus === 'processing').length
      const sentCount = registries.filter(r => r.transmissionStatus === 'sent').length
      const errorCount = registries.filter(r => r.transmissionStatus === 'error').length
      
      // Obtener último procesado
      const lastProcessed = registries
        .filter(r => r.transmissionDate)
        .sort((a, b) => new Date(b.transmissionDate!).getTime() - new Date(a.transmissionDate!).getTime())[0]
      
      const stats = {
        pendingCount,
        processingCount,
        sentCount,
        errorCount,
        lastProcessedAt: lastProcessed?.transmissionDate || undefined
      }
      
      console.log('📊 Worker Stats calculadas:', stats)
      
      return stats
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del worker:', error)
      return {
        pendingCount: 0,
        processingCount: 0,
        sentCount: 0,
        errorCount: 0
      }
    }
  }
}