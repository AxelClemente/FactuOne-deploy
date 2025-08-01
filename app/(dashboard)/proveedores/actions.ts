"use server"

import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { getDb } from "@/lib/db"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { providers, userModuleExclusions } from "@/app/db/schema"
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

export async function getProviders(businessId: string, userId?: string) {
  try {
    const db = await getDb()
    // Obtener proveedores
    let providersList = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.businessId, businessId),
          eq(providers.isDeleted, false)
        )
      )

    // Si hay userId, filtrar por exclusiones
    if (userId) {
      const excludedProviderIds = await db.select().from(userModuleExclusions)
        .where(
          and(
            eq(userModuleExclusions.userId, userId),
            eq(userModuleExclusions.businessId, businessId),
            eq(userModuleExclusions.module, "providers")
          )
        )
        .then(rows => rows.map(r => r.entityId));
      providersList = providersList.filter(p => !excludedProviderIds.includes(p.id));
    }
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

export async function createProvider(businessId: string, data: z.infer<typeof providerSchema>) {
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

    // Verificar NIF duplicado en el mismo negocio
    const existingProvider = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.businessId, businessId),
          eq(providers.nif, validatedData.nif),
          eq(providers.isDeleted, false)
        )
      )
      .then((rows) => rows[0]);

    if (existingProvider) {
      return { success: false, error: "Ya existe un proveedor con este NIF en este negocio" };
    }

    const providerId = uuidv4();
    await db.insert(providers).values({
      id: providerId,
      businessId,
      ...validatedData,
    })
    return { success: true, providerId }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: error instanceof Error ? error.message : "Error al crear proveedor" }
  }
}

export async function updateProvider(providerId: string, data: z.infer<typeof providerSchema>) {
  try {
    // Obtener usuario actual y comprobar permiso
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No has iniciado sesión" };
    }

    const validatedData = providerSchema.parse(data)
    const db = await getDb()

    // Verificar que el proveedor existe y obtener su businessId
    const existingProvider = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.id, providerId),
          eq(providers.isDeleted, false)
        )
      )
      .then((rows) => rows[0]);

    if (!existingProvider) {
      return { success: false, error: "El proveedor no existe" };
    }

    const canEdit = await hasPermission(user.id, existingProvider.businessId, "providers", "edit");
    if (!canEdit) {
      return { success: false, error: "No tienes permisos para editar proveedores" };
    }

    // Verificar NIF duplicado (excluyendo el proveedor actual)
    const duplicateProvider = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.businessId, existingProvider.businessId),
          eq(providers.nif, validatedData.nif),
          eq(providers.isDeleted, false),
          sql`${providers.id} != ${providerId}`
        )
      )
      .then((rows) => rows[0]);

    if (duplicateProvider) {
      return { success: false, error: "Ya existe otro proveedor con este NIF en este negocio" };
    }

    await db.update(providers)
      .set(validatedData)
      .where(eq(providers.id, providerId))
    
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar proveedor" }
  }
}

export async function deleteProvider(providerId: string) {
  try {
    // Obtener usuario actual y comprobar permiso
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No has iniciado sesión" };
    }

    const db = await getDb()

    // Verificar que el proveedor existe y obtener su businessId
    const existingProvider = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.id, providerId),
          eq(providers.isDeleted, false)
        )
      )
      .then((rows) => rows[0]);

    if (!existingProvider) {
      return { success: false, error: "El proveedor no existe" };
    }

    const canDelete = await hasPermission(user.id, existingProvider.businessId, "providers", "delete");
    if (!canDelete) {
      return { success: false, error: "No tienes permisos para eliminar proveedores" };
    }

    // Verificar si tiene facturas recibidas asociadas
    const hasInvoices = await db
      .select()
      .from(receivedInvoices)
      .where(
        and(
          eq(receivedInvoices.providerId, providerId),
          eq(receivedInvoices.isDeleted, false)
        )
      )
      .then((rows) => rows.length > 0);

    if (hasInvoices) {
      return { success: false, error: "No se puede eliminar el proveedor porque tiene facturas recibidas asociadas" };
    }

    await db.update(providers)
      .set({ isDeleted: true })
      .where(eq(providers.id, providerId))
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al eliminar proveedor" }
  }
}

// Obtener proveedores para el usuario actual (versión pública)
export async function getProvidersForCurrentUser(businessId: string) {
  const user = await getCurrentUser()
  const userId = user?.id

  return getProviders(businessId, userId)
} 