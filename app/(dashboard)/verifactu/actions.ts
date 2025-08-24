"use server"

import { z } from "zod"
import { getDb } from "@/lib/db"
import { verifactuConfig, verifactuRegistry, verifactuEvents } from "@/app/db/schema"
import { eq, and, desc, or, count } from "drizzle-orm"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { VerifactuService } from "@/lib/verifactu-service"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

// Schema de validación para configuración
const configSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["verifactu", "requerimiento"]),
  environment: z.enum(["production", "testing"]),
  autoSubmit: z.boolean(),
  includeInPdf: z.boolean(),
  flowControlSeconds: z.number().min(60).max(3600),
  maxRecordsPerSubmission: z.number().min(1).max(1000),
})

type ConfigFormData = z.infer<typeof configSchema>

export async function getVerifactuConfig() {
  const user = await getCurrentUser()
  if (!user) throw new Error("No autorizado")

  const businessId = await getActiveBusiness()
  if (!businessId) throw new Error("No se encontró el negocio activo")

  const canView = await hasPermission(user.id, businessId, "invoices", "view")
  if (!canView) throw new Error("Sin permisos para ver la configuración")

  const config = await VerifactuService.getConfig(businessId)
  return config
}

export async function updateVerifactuConfig(data: ConfigFormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("No autorizado")

  const businessId = await getActiveBusiness()
  if (!businessId) throw new Error("No se encontró el negocio activo")

  const canEdit = await hasPermission(user.id, businessId, "invoices", "create")
  if (!canEdit) throw new Error("Sin permisos para modificar la configuración")

  try {
    const validated = configSchema.parse(data)
    
    await VerifactuService.upsertConfig(businessId, validated)
    
    revalidatePath("/verifactu")
    
    return { success: true }
  } catch (error) {
    console.error("Error actualizando configuración VERI*FACTU:", error)
    return { 
      success: false, 
      error: error instanceof z.ZodError 
        ? "Datos de configuración inválidos" 
        : "Error al actualizar la configuración" 
    }
  }
}

export async function getVerifactuStats() {
  const user = await getCurrentUser()
  if (!user) throw new Error("No autorizado")

  const businessId = await getActiveBusiness()
  if (!businessId) throw new Error("No se encontró el negocio activo")

  const canView = await hasPermission(user.id, businessId, "invoices", "view")
  if (!canView) throw new Error("Sin permisos para ver las estadísticas")

  const db = await getDb()
  
  // Obtener estadísticas de registros
  const stats = await db
    .select({
      status: verifactuRegistry.transmissionStatus,
      count: count(),
    })
    .from(verifactuRegistry)
    .where(eq(verifactuRegistry.businessId, businessId))
    .groupBy(verifactuRegistry.transmissionStatus)

  // Obtener último registro
  const [lastRegistry] = await db
    .select()
    .from(verifactuRegistry)
    .where(eq(verifactuRegistry.businessId, businessId))
    .orderBy(desc(verifactuRegistry.createdAt))
    .limit(1)

  // Contar totales
  const totalRegistries = stats.reduce((acc, stat) => acc + Number(stat.count), 0)
  const pendingCount = stats.find(s => s.status === 'pending')?.count || 0
  const sentCount = stats.find(s => s.status === 'sent')?.count || 0
  const errorCount = stats.find(s => s.status === 'error')?.count || 0

  return {
    totalRegistries,
    pendingCount: Number(pendingCount),
    sentCount: Number(sentCount),
    errorCount: Number(errorCount),
    lastRegistry,
    stats
  }
}

export async function getVerifactuRegistries(page = 1, limit = 10) {
  console.log('🔍 getVerifactuRegistries - Iniciando función', { page, limit })
  
  const user = await getCurrentUser()
  if (!user) throw new Error("No autorizado")

  const businessId = await getActiveBusiness()
  if (!businessId) throw new Error("No se encontró el negocio activo")
  
  console.log('🏢 BusinessId obtenido:', businessId)

  const canView = await hasPermission(user.id, businessId, "invoices", "view")
  if (!canView) throw new Error("Sin permisos para ver los registros")

  const db = await getDb()
  const offset = (page - 1) * limit

  console.log('📊 Consultando registros...')
  const registries = await db
    .select({
      id: verifactuRegistry.id,
      businessId: verifactuRegistry.businessId,
      invoiceId: verifactuRegistry.invoiceId,
      invoiceType: verifactuRegistry.invoiceType,
      sequenceNumber: verifactuRegistry.sequenceNumber,
      currentHash: verifactuRegistry.currentHash,
      qrUrl: verifactuRegistry.qrUrl,
      transmissionStatus: verifactuRegistry.transmissionStatus,
      transmissionDate: verifactuRegistry.transmissionDate,
      aeatCsv: verifactuRegistry.aeatCsv,
      errorMessage: verifactuRegistry.errorMessage,
      createdAt: verifactuRegistry.createdAt,
      updatedAt: verifactuRegistry.updatedAt
    })
    .from(verifactuRegistry)
    .where(eq(verifactuRegistry.businessId, businessId))
    .orderBy(desc(verifactuRegistry.sequenceNumber))
    .limit(limit)
    .offset(offset)

  console.log('📋 Registros encontrados:', registries.length)

  const countResult = await db
    .select({ count: count() })
    .from(verifactuRegistry)
    .where(eq(verifactuRegistry.businessId, businessId))

  const totalCount = countResult[0]?.count || 0
  console.log('🔢 Total de registros:', totalCount)

  return {
    registries,
    totalCount: Number(totalCount),
    totalPages: Math.ceil(Number(totalCount) / limit)
  }
}

export async function retryVerifactuSubmission(registryId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("No autorizado")

  const businessId = await getActiveBusiness()
  if (!businessId) throw new Error("No se encontró el negocio activo")

  const canEdit = await hasPermission(user.id, businessId, "invoices", "create")
  if (!canEdit) throw new Error("Sin permisos para reenviar registros")

  try {
    const db = await getDb()
    
    // Verificar que el registro pertenece al negocio
    const [registry] = await db
      .select()
      .from(verifactuRegistry)
      .where(
        and(
          eq(verifactuRegistry.id, registryId),
          eq(verifactuRegistry.businessId, businessId)
        )
      )

    if (!registry) {
      throw new Error("Registro no encontrado")
    }

    if (registry.transmissionStatus !== 'error') {
      throw new Error("Solo se pueden reintentar registros con error")
    }

    // Marcar para reintento inmediato
    await db
      .update(verifactuRegistry)
      .set({
        transmissionStatus: 'pending',
        nextRetryAt: null,
        retryCount: registry.retryCount
      })
      .where(eq(verifactuRegistry.id, registryId))

    await VerifactuService.createEvent(businessId, 'retry', { 
      manualRetry: true,
      previousStatus: registry.transmissionStatus 
    }, registryId)

    revalidatePath("/verifactu")
    
    return { success: true }
  } catch (error) {
    console.error("Error reintentando envío:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al reintentar el envío" 
    }
  }
}

export async function activateRegistryForRequirement(registryId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("No autorizado")

  const businessId = await getActiveBusiness()
  if (!businessId) throw new Error("No se encontró el negocio activo")

  const canEdit = await hasPermission(user.id, businessId, "invoices", "create")
  if (!canEdit) throw new Error("Sin permisos para activar registros")

  try {
    const db = await getDb()
    
    // Verificar que el registro pertenece al negocio
    const [registry] = await db
      .select()
      .from(verifactuRegistry)
      .where(
        and(
          eq(verifactuRegistry.id, registryId),
          eq(verifactuRegistry.businessId, businessId)
        )
      )

    if (!registry) {
      throw new Error("Registro no encontrado")
    }

    if (registry.transmissionStatus !== 'dormant') {
      throw new Error("Solo se pueden activar registros en estado dormant")
    }

    // Cambiar estado de dormant a pending para procesamiento
    await db
      .update(verifactuRegistry)
      .set({
        transmissionStatus: 'pending',
        nextRetryAt: new Date(), // Procesar inmediatamente
        activatedAt: new Date()  // Marcar cuándo se activó manualmente
      })
      .where(eq(verifactuRegistry.id, registryId))

    await VerifactuService.createEvent(businessId, 'requirement_activation', { 
      manualActivation: true,
      previousStatus: 'dormant',
      activatedBy: user.id
    }, registryId)

    revalidatePath("/verifactu")
    
    return { success: true }
  } catch (error) {
    console.error("Error activando registro para requerimiento:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al activar el registro" 
    }
  }
}

// Schema para certificados
const certificateSchema = z.object({
  certificatePath: z.string().optional(),
  certificatePassword: z.string().optional(),
})

export async function updateCertificateConfig(data: z.infer<typeof certificateSchema>) {
  const user = await getCurrentUser()
  if (!user) throw new Error("No autorizado")

  const businessId = await getActiveBusiness()
  if (!businessId) throw new Error("No se encontró el negocio activo")

  const canEdit = await hasPermission(user.id, businessId, "invoices", "create")
  if (!canEdit) throw new Error("Sin permisos para modificar certificados")

  try {
    const validated = certificateSchema.parse(data)
    const db = await getDb()
    
    // Obtener configuración actual
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
          certificatePath: validated.certificatePath || null,
          certificatePasswordEncrypted: validated.certificatePassword || null,
          updatedAt: new Date()
        })
        .where(eq(verifactuConfig.businessId, businessId))
    } else {
      // Crear nueva configuración con valores por defecto
      await db
        .insert(verifactuConfig)
        .values({
          id: randomUUID(),
          businessId,
          enabled: false,
          mode: 'verifactu',
          environment: 'testing',
          certificatePath: validated.certificatePath || null,
          certificatePasswordEncrypted: validated.certificatePassword || null,
          lastSequenceNumber: 0,
          flowControlSeconds: 60,
          maxRecordsPerSubmission: 100,
          autoSubmit: true,
          includeInPdf: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
    }
    
    revalidatePath("/verifactu")
    
    return { success: true }
  } catch (error) {
    console.error("Error actualizando certificado:", error)
    return { 
      success: false, 
      error: error instanceof z.ZodError 
        ? "Datos de certificado inválidos" 
        : "Error al actualizar el certificado" 
    }
  }
}