"use server"

import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { providers } from "@/app/db/schema"
import { eq, and } from "drizzle-orm"

const providerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  nif: z.string().min(1, "El NIF es obligatorio"),
  address: z.string().min(1, "La dirección es obligatoria"),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  email: z.string().email("Email inválido"),
})

export async function getProviders(businessId: string) {
  try {
    const db = await getDb()
    return await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.businessId, businessId),
          eq(providers.isDeleted, false)
        )
      )
  } catch {
    return []
  }
}

export async function createProvider(data: z.infer<typeof providerSchema>, businessId: string) {
  try {
    const validatedData = providerSchema.parse(data)
    const db = await getDb()
    await db.insert(providers).values({
      id: uuidv4(),
      businessId,
      ...validatedData,
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al crear proveedor" }
  }
}

export async function updateProvider(providerId: string, data: z.infer<typeof providerSchema>, businessId: string) {
  try {
    const validatedData = providerSchema.parse(data)
    const db = await getDb()
    await db.update(providers)
      .set(validatedData)
      .where(
        and(
          eq(providers.id, providerId),
          eq(providers.businessId, businessId)
        )
      )
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar proveedor" }
  }
}

export async function deleteProvider(providerId: string, businessId: string) {
  try {
    const db = await getDb()
    await db.update(providers)
      .set({ isDeleted: true })
      .where(
        and(
          eq(providers.id, providerId),
          eq(providers.businessId, businessId)
        )
      )
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al eliminar proveedor" }
  }
} 