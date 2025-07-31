import { NextRequest, NextResponse } from 'next/server'
import { VerifactuWorkerSimple } from '@/lib/verifactu-worker-simple'
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener negocio activo
    const activeBusiness = await getActiveBusiness()
    if (!activeBusiness) {
      return NextResponse.json({ error: 'No se encontró negocio activo' }, { status: 400 })
    }

    // Obtener estadísticas del worker
    const stats = await VerifactuWorkerSimple.getWorkerStats(activeBusiness.id)
    
    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error obteniendo estadísticas del worker:', error)
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener negocio activo
    const activeBusiness = await getActiveBusiness()
    if (!activeBusiness) {
      return NextResponse.json({ error: 'No se encontró negocio activo' }, { status: 400 })
    }

    const body = await request.json()
    const action = body.action || 'process'

    let result

    // TODO: Implementar acciones del worker cuando esté completo
    result = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [`Acción "${action}" temporalmente deshabilitada - worker en desarrollo`],
      lastProcessedAt: new Date()
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error ejecutando worker:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}