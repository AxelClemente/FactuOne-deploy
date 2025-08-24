import { NextRequest, NextResponse } from 'next/server'
import { VerifactuWorkerSimple } from '@/lib/verifactu-worker-simple'
import { VerifactuWorker } from '@/lib/verifactu-worker'
import { getCurrentUser } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/getActiveBusiness'

/**
 * API para manejo manual del worker VERI*FACTU
 * 
 * GET  /api/verifactu/worker - Obtener estadísticas del worker
 * POST /api/verifactu/worker - Ejecutar procesamiento manual
 */

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      console.log('🔒 API Worker: Usuario no autenticado')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener negocio activo (mantener por compatibilidad)
    const activeBusiness = await getActiveBusiness()
    if (!activeBusiness) {
      console.log('⚠️ API Worker: No se encontró negocio activo')
      return NextResponse.json({ error: 'No se encontró negocio activo' }, { status: 400 })
    }

    console.log('📊 API Worker GET: Obteniendo stats para negocio:', activeBusiness.id)

    // Obtener estadísticas del worker
    const stats = await VerifactuWorkerSimple.getWorkerStats(activeBusiness.id)
    
    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del worker:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      console.log('🔒 API Worker POST: Usuario no autenticado')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action || 'process'
    let businessId = body.businessId

    console.log('🎯 API Worker POST: Acción:', action, 'BusinessId recibido:', businessId)

    // Si no se proporciona businessId, intentar obtenerlo
    if (!businessId) {
      const activeBusiness = await getActiveBusiness()
      if (!activeBusiness) {
        console.log('⚠️ API Worker POST: No se encontró negocio activo')
        return NextResponse.json({ error: 'No se encontró negocio activo' }, { status: 400 })
      }
      businessId = activeBusiness.id
      console.log('🔄 API Worker POST: BusinessId obtenido de cookies:', businessId)
    }

    let result

    // Ejecutar acción según el tipo
    switch (action) {
      case 'stats':
        console.log('📊 API Worker: Obteniendo estadísticas para:', businessId)
        const stats = await VerifactuWorkerSimple.getWorkerStats(businessId)
        result = stats
        break

      case 'process':
        console.log('⚙️ API Worker: Procesando cola para:', businessId)
        const processResult = await VerifactuWorker.processBusinessQueue(businessId, {
          batchSize: body.config?.batchSize || 10,
          flowControlDelay: body.config?.flowControlDelay || 60,
          maxRetries: 3
        })
        result = {
          processed: processResult.processed || 0,
          successful: processResult.successful || 0,
          failed: processResult.failed || 0,
          errors: processResult.errors || [],
          lastProcessedAt: new Date().toISOString()
        }
        console.log('✅ API Worker: Procesamiento completado:', result)
        break

      case 'retry':
        console.log('🔄 API Worker: Reintentando errores para:', businessId)
        const retryResult = await VerifactuWorker.processRetries(businessId)
        result = {
          processed: retryResult.processed || 0,
          successful: retryResult.successful || 0,
          failed: retryResult.failed || 0,
          errors: retryResult.errors || [],
          lastProcessedAt: new Date().toISOString()
        }
        console.log('✅ API Worker: Reintentos completados:', result)
        break

      case 'cleanup':
        console.log('🗑️ API Worker: Limpiando registros antiguos para:', businessId)
        const cleanupCount = await VerifactuWorker.cleanupOldRegistries(
          businessId, 
          body.retentionDays || 365
        )
        result = {
          processed: cleanupCount,
          successful: cleanupCount,
          failed: 0,
          errors: [],
          lastProcessedAt: new Date().toISOString()
        }
        console.log('✅ API Worker: Limpieza completada, eliminados:', cleanupCount)
        break

      default:
        console.log('❌ API Worker: Acción desconocida:', action)
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('❌ API Worker: Error ejecutando acción:', error)
    return NextResponse.json(
      { error: `Error interno del servidor: ${error.message}` },
      { status: 500 }
    )
  }
}