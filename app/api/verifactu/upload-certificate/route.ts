import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getCurrentUser } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/getActiveBusiness'
import { getDb } from '@/lib/db'
import { verifactuConfig } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

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
      access: 'private', // Importante: acceso privado
      contentType: 'application/x-pkcs12'
    })

    console.log('📁 Certificado subido a Blob:', blob.url)

    // Guardar configuración en BD
    const db = await getDb()
    
    // Verificar si ya existe configuración
    const [existingConfig] = await db
      .select()
      .from(verifactuConfig)
      .where(eq(verifactuConfig.businessId, businessId))
      .limit(1)

    if (existingConfig) {
      // Actualizar configuración existente
      await db
        .update(verifactuConfig)
        .set({
          certificatePath: blob.url, // Guardamos la URL del blob
          certificatePasswordEncrypted: password || null, // Por ahora sin encriptar
          certificateUploadedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(verifactuConfig.businessId, businessId))
    } else {
      // Crear nueva configuración
      await db
        .insert(verifactuConfig)
        .values({
          id: randomUUID(),
          businessId,
          enabled: false,
          mode: 'verifactu',
          environment: 'testing',
          certificatePath: blob.url,
          certificatePasswordEncrypted: password || null,
          certificateUploadedAt: new Date(),
          lastSequenceNumber: 0,
          flowControlSeconds: 60,
          maxRecordsPerSubmission: 100,
          autoSubmit: true,
          includeInPdf: true,
          createdAt: new Date(),
          updatedAt: new Date()
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