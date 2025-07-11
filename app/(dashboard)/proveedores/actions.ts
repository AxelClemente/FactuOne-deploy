"use server"

import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { getDb } from "@/lib/db"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { providers } from "@/app/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { receivedInvoices } from "@/app/db/schema"

const providerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  nif: z.string().min(1, "El NIF es obligatorio"),
  address: z.string().min(1, "La dirección es obligatoria"),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")).refine(
    (val) => !val || /^[^@]+@[^@]+\.[^@]+$/.test(val),
    { message: "Email inválido" }
  ),
})

export async function getProviders(businessId: string) {
  try {
    const db = await getDb()
    // Obtener proveedores
    const providersList = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.businessId, businessId),
          eq(providers.isDeleted, false)
        )
      )
    // Obtener el número de facturas y totales asociadas a cada proveedor
    const providerIds = providersList.map((p) => p.id)
    let invoiceCounts: Record<string, number> = {}
    let stats: Record<string, any> = {}
    if (providerIds.length > 0) {
      // Obtener todas las facturas recibidas de estos proveedores
      const allInvoices = await db
        .select()
        .from(receivedInvoices)
        .where(
          and(
            eq(receivedInvoices.businessId, businessId),
            eq(receivedInvoices.isDeleted, false),
            inArray(receivedInvoices.providerId, providerIds)
          )
        )
      // Agrupar y calcular stats por proveedor
      providerIds.forEach((providerId) => {
        const invoices = allInvoices.filter(inv => inv.providerId === providerId)
        // Ahora 'paid' y 'recorded' son facturado, solo 'pending' es pendiente
        const facturadas = invoices.filter(inv => inv.status === "paid" || inv.status === "recorded")
        const pendientes = invoices.filter(inv => inv.status === "pending")
        const totalInvoicedBase = facturadas.reduce((sum, inv) => sum + Number(inv.amount), 0)
        const totalInvoicedIVA = facturadas.reduce((sum, inv) => sum + Number(inv.taxAmount), 0)
        const totalInvoiced = facturadas.reduce((sum, inv) => sum + Number(inv.total), 0)
        const totalPendingBase = pendientes.reduce((sum, inv) => sum + Number(inv.amount), 0)
        const totalPendingIVA = pendientes.reduce((sum, inv) => sum + Number(inv.taxAmount), 0)
        const totalPending = pendientes.reduce((sum, inv) => sum + Number(inv.total), 0)
        stats[providerId] = {
          totalInvoiced,
          totalPending,
          totalInvoicedBase,
          totalPendingBase,
          totalInvoicedIVA,
          totalPendingIVA,
        }
        invoiceCounts[providerId] = invoices.length
      })
    }
    // Añadir stats a cada proveedor
    return providersList.map((p) => ({
      ...p,
      invoiceCount: invoiceCounts[p.id] || 0,
      totalInvoiced: stats[p.id]?.totalInvoiced || 0,
      totalPending: stats[p.id]?.totalPending || 0,
      totalInvoicedBase: stats[p.id]?.totalInvoicedBase || 0,
      totalPendingBase: stats[p.id]?.totalPendingBase || 0,
      totalInvoicedIVA: stats[p.id]?.totalInvoicedIVA || 0,
      totalPendingIVA: stats[p.id]?.totalPendingIVA || 0,
    }))
  } catch {
    return []
  }
}

export async function createProvider(data: z.infer<typeof providerSchema>, businessId: string) {
  try {
    // Obtener usuario actual y comprobar permiso
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No has iniciado sesión" };
    }

    const canCreate = await hasPermission(user.id, businessId, "providers", "create");
    if (!canCreate) {
      return { success: false, error: "No tienes permisos para crear proveedores" };
    }

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