import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
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

    // Obtener FormData
    const formData = await request.formData()
    const certificateFile = formData.get('certificate') as File
    const password = formData.get('password') as string

    if (!certificateFile) {
      return NextResponse.json({ error: 'Certificado requerido' }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!certificateFile.name.match(/\.(p12|pfx)$/i)) {
      return NextResponse.json({ error: 'Solo se aceptan archivos .p12 o .pfx' }, { status: 400 })
    }

    // Subir a Vercel Blob
    const filename = `certificate-${businessId}-${Date.now()}.${certificateFile.name.split('.').pop()}`
    const blob = await put(filename, certificateFile, {
      access: 'public', // NOTA: En plan gratuito solo funciona 'public'
      contentType: 'application/x-pkcs12'
    })

    console.log('📁 Certificado subido a Blob:', blob.url)

    // Guardar certificado y contraseña de forma segura
    if (password) {
      await VerifactuService.updateCertificateAndPassword(
        businessId,
        blob.url,
        password
      )
    } else {
      // Solo actualizar certificado sin contraseña
      await VerifactuService.upsertConfig(businessId, {
        certificatePath: blob.url,
        certificateUploadedAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Certificado cargado correctamente',
      filename: certificateFile.name,
      size: certificateFile.size
    })

  } catch (error) {
    console.error('Error cargando certificado:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}