import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/getActiveBusiness'
import { VerifactuService } from '@/lib/verifactu-service'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener negocio activo
    const businessId = await getActiveBusiness()
    if (!businessId) {
      return NextResponse.json({ error: 'No se encontró negocio activo' }, { status: 400 })
    }

    // Obtener datos del request
    const { password } = await request.json()

    if (!password?.trim()) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    }

    // Verificar si existe configuración
    const existingConfig = await VerifactuService.getConfig(businessId)

    if (existingConfig) {
      // Actualizar solo la contraseña usando encriptación
      await VerifactuService.updateCertificatePassword(businessId, password.trim())
    } else {
      // Crear configuración básica con contraseña encriptada
      await VerifactuService.upsertConfig(businessId, {
        enabled: false,
        mode: 'verifactu',
        environment: 'testing',
        certificatePath: null,
        lastSequenceNumber: 0,
        flowControlSeconds: 60,
        maxRecordsPerSubmission: 100,
        autoSubmit: true,
        includeInPdf: true
      })
      
      // Actualizar la contraseña de forma segura
      await VerifactuService.updateCertificatePassword(businessId, password.trim())
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    })

  } catch (error) {
    console.error('Error actualizando contraseña:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}