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
      
      // Contar por estado
      const stats = await db
        .select({
          status: schema.verifactuRegistry.transmissionStatus,
          count: schema.verifactuRegistry.id
        })
        .from(schema.verifactuRegistry)
        .where(eq(schema.verifactuRegistry.businessId, businessId))
      
      console.log('📋 Stats obtenidas:', stats)
      
      // Obtener último procesado
      const lastProcessed = await db
        .select()
        .from(schema.verifactuRegistry)
        .where(eq(schema.verifactuRegistry.businessId, businessId))
        .orderBy(schema.verifactuRegistry.transmissionDate)
        .limit(1)
      
      return {
        pendingCount: 0, // Por ahora simplificado
        processingCount: 0,
        sentCount: 0,
        errorCount: 0,
        lastProcessedAt: lastProcessed[0]?.transmissionDate || undefined
      }
      
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