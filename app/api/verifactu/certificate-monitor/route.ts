import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/getActiveBusiness'
import { CertificateMonitor, runCertificateMonitor } from '@/lib/certificate-monitor'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status': {
        // Obtener estado del certificado del negocio activo
        const businessId = await getActiveBusiness()
        if (!businessId) {
          return NextResponse.json({ error: 'No se encontró negocio activo' }, { status: 400 })
        }

        const status = await CertificateMonitor.checkBusinessCertificate(businessId, 'Negocio actual')
        
        return NextResponse.json({
          status: status || {
            businessId,
            businessName: 'Negocio actual',
            isExpired: true,
            isExpiringSoon: false,
            daysUntilExpiration: -1,
            validUntil: null
          }
        })
      }

      case 'summary': {
        // Resumen general (solo para admins)
        const summary = await CertificateMonitor.getCertificateSummary()
        
        return NextResponse.json({
          summary
        })
      }

      case 'check-all': {
        // Verificar todos los certificados (solo para admins)
        const results = await CertificateMonitor.checkAllCertificates()
        
        return NextResponse.json({
          results,
          summary: {
            total: results.length,
            expired: results.filter(r => r.isExpired).length,
            expiringSoon: results.filter(r => r.isExpiringSoon && !r.isExpired).length,
            healthy: results.filter(r => !r.isExpired && !r.isExpiringSoon).length
          }
        })
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error en monitor de certificados:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'run-monitor': {
        // Ejecutar monitor manualmente (solo para admins)
        await runCertificateMonitor()
        
        return NextResponse.json({
          success: true,
          message: 'Monitor de certificados ejecutado correctamente'
        })
      }

      case 'cleanup-notifications': {
        // Limpiar notificaciones antiguas
        const cleaned = await CertificateMonitor.cleanupOldNotifications()
        
        return NextResponse.json({
          success: true,
          message: `${cleaned} notificaciones antiguas eliminadas`
        })
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error ejecutando acción del monitor:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}