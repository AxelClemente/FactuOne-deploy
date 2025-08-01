import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/getActiveBusiness'
import { CertificateManager } from '@/lib/certificate-manager'
import { VerifactuSigner } from '@/lib/verifactu-signer'

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
    const action = formData.get('action') as string

    if (!certificateFile || !password) {
      return NextResponse.json({ error: 'Certificado y contraseña requeridos' }, { status: 400 })
    }

    // Convertir archivo a Buffer
    const certificateBuffer = Buffer.from(await certificateFile.arrayBuffer())

    // Si es solo verificación
    if (action === 'verify') {
      try {
        // Crear archivo temporal para verificación
        const tempPath = `/tmp/temp_cert_${Date.now()}.p12`
        const fs = require('fs').promises
        await fs.writeFile(tempPath, certificateBuffer)

        // Verificar certificado
        const result = await VerifactuSigner.verifyCertificateFile(tempPath, password)
        
        // Limpiar archivo temporal
        await fs.unlink(tempPath)

        if (!result.isValid) {
          return NextResponse.json({ 
            isValid: false, 
            error: 'Certificado no válido o contraseña incorrecta' 
          }, { status: 400 })
        }

        return NextResponse.json({
          isValid: true,
          certificateInfo: result.certificateInfo
        })

      } catch (error) {
        console.error('Error verificando certificado:', error)
        return NextResponse.json({ 
          isValid: false, 
          error: 'Error al verificar el certificado' 
        }, { status: 500 })
      }
    }

    // Si es carga completa
    try {
      // Verificar primero que es válido
      const tempPath = `/tmp/temp_cert_${Date.now()}.p12`
      const fs = require('fs').promises
      await fs.writeFile(tempPath, certificateBuffer)

      const verifyResult = await VerifactuSigner.verifyCertificateFile(tempPath, password)
      
      if (!verifyResult.isValid) {
        await fs.unlink(tempPath)
        return NextResponse.json({ 
          error: 'Certificado no válido o contraseña incorrecta' 
        }, { status: 400 })
      }

      // Limpiar temporal
      await fs.unlink(tempPath)

      // Guardar certificado de forma segura
      const certificatePath = await CertificateManager.storeCertificate(
        businessId,
        certificateBuffer,
        password
      )

      // Validar fechas de expiración
      const validTo = new Date(verifyResult.certificateInfo!.validTo)
      const daysUntilExpiration = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiration < 30) {
        console.warn(`⚠️ Certificado expira en ${daysUntilExpiration} días`)
      }

      return NextResponse.json({
        success: true,
        certificateInfo: verifyResult.certificateInfo,
        daysUntilExpiration,
        message: 'Certificado cargado correctamente'
      })

    } catch (error) {
      console.error('Error cargando certificado:', error)
      return NextResponse.json({ 
        error: 'Error al cargar el certificado' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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

    // Obtener información del certificado actual
    try {
      const certificateInfo = await CertificateManager.getCertificateInfo(businessId)
      
      if (!certificateInfo) {
        return NextResponse.json({
          hasCertificate: false,
          message: 'No hay certificado configurado'
        })
      }

      // Calcular días hasta expiración
      const validTo = new Date(certificateInfo.validTo)
      const daysUntilExpiration = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      return NextResponse.json({
        hasCertificate: true,
        certificateInfo: {
          subject: certificateInfo.subject,
          issuer: certificateInfo.issuer,
          validFrom: certificateInfo.validFrom,
          validTo: certificateInfo.validTo,
          uploadedAt: certificateInfo.uploadedAt
        },
        daysUntilExpiration,
        isExpired: daysUntilExpiration < 0,
        isExpiringSoon: daysUntilExpiration < 30 && daysUntilExpiration >= 0
      })

    } catch (error) {
      return NextResponse.json({
        hasCertificate: false,
        message: 'No hay certificado configurado'
      })
    }

  } catch (error) {
    console.error('Error obteniendo información del certificado:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}