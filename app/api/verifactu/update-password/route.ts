import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/getActiveBusiness'
import { getDb } from '@/lib/db'
import { verifactuConfig } from '@/app/db/schema'
import { eq } from 'drizzle-orm'

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

    const db = await getDb()
    
    // Verificar si existe configuración
    const [existingConfig] = await db
      .select()
      .from(verifactuConfig)
      .where(eq(verifactuConfig.businessId, businessId))
      .limit(1)

    if (existingConfig) {
      // Actualizar solo la contraseña
      await db
        .update(verifactuConfig)
        .set({
          certificatePasswordEncrypted: password.trim(), // Por ahora sin encriptar
          updatedAt: new Date()
        })
        .where(eq(verifactuConfig.businessId, businessId))
    } else {
      // Crear configuración básica con solo la contraseña
      await db
        .insert(verifactuConfig)
        .values({
          id: crypto.randomUUID(),
          businessId,
          enabled: false,
          mode: 'verifactu',
          environment: 'testing',
          certificatePath: null,
          certificatePasswordEncrypted: password.trim(),
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
      message: 'Contraseña actualizada correctamente'
    })

  } catch (error) {
    console.error('Error actualizando contraseña:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}