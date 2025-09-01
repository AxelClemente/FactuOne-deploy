"use server"

import { z } from "zod"
import { getDb } from "@/lib/db"
import { clients, invoices, userModuleExclusions } from "@/app/db/schema"
import { eq, and, ne } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { createNotification } from "@/lib/notifications"
import { getCurrentUser, hasPermission } from "@/lib/auth"

// Esquema de validación para clientes
const clientSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  nif: z.string().min(1, { message: "El NIF/CIF es obligatorio" }),
  address: z.string().min(1, { message: "La dirección es obligatoria" }),
  email: z.string().email({ message: "El email debe tener un formato válido" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
})

type ClientFormData = z.infer<typeof clientSchema>

type ClientActionResult = {
  success: boolean
  error?: string
  clientId?: string
}

// Acción para crear un nuevo cliente
export async function createClient(businessId: string, formData: ClientFormData): Promise<ClientActionResult> {
  console.log("Creando nuevo cliente para el negocio:", businessId)

  try {
    // Obtener usuario actual y comprobar permiso
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No has iniciado sesión" };
    }
    const canCreate = await hasPermission(user.id, businessId, "clients", "create");
    if (!canCreate) {
      return { success: false, error: "No tienes permisos para crear clientes" };
    }

    // Validar los datos del formulario
    const validatedData = clientSchema.parse(formData)
    const db = await getDb()

    // Verificar si ya existe un cliente con el mismo NIF en este negocio
    const existingClient = await db.select().from(clients).where(
      and(
        eq(clients.businessId, businessId),
        eq(clients.nif, validatedData.nif)
      )
    ).limit(1)

    if (existingClient.length > 0) {
      return {
        success: false,
        error: "Ya existe un cliente con este NIF/CIF en tu negocio",
      }
    }

    // Crear el nuevo cliente
    const clientId = uuidv4()
    await db.insert(clients).values({
      id: clientId,
      businessId: businessId,
      name: validatedData.name,
      nif: validatedData.nif,
      address: validatedData.address,
      email: validatedData.email || "",
      phone: validatedData.phone || "",
    })

    // Crear notificación
    await createNotification({
      businessId,
      title: "Nuevo cliente registrado",
      message: `Cliente: ${validatedData.name} · NIF: ${validatedData.nif} · ${new Date().toLocaleDateString("es-ES")}`,
      type: "action",
    })

    console.log("Cliente creado:", clientId)

    return {
      success: true,
      clientId: clientId,
    }
  } catch (error) {
    console.error("Error al crear cliente:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos de formulario inválidos",
      }
    }

    return {
      success: false,
      error: "Error al crear el cliente",
    }
  }
}

// Acción para actualizar un cliente existente
export async function updateClient(clientId: string, formData: ClientFormData): Promise<ClientActionResult> {
  console.log("Actualizando cliente:", clientId)

  try {
    // Validar los datos del formulario
    const validatedData = clientSchema.parse(formData)
    const db = await getDb()

    // Obtener el cliente actual para verificar su negocio
    const currentClient = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)

    if (currentClient.length === 0) {
      return {
        success: false,
        error: "Cliente no encontrado",
      }
    }

    // Verificar si ya existe otro cliente con el mismo NIF en este negocio
    const existingClient = await db.select().from(clients).where(
      and(
        eq(clients.businessId, currentClient[0].businessId),
        eq(clients.nif, validatedData.nif),
        ne(clients.id, clientId)
      )
    ).limit(1)

    if (existingClient.length > 0) {
      return {
        success: false,
        error: "Ya existe otro cliente con este NIF/CIF en tu negocio",
      }
    }

    // Actualizar el cliente
    await db.update(clients)
      .set({
        name: validatedData.name,
        nif: validatedData.nif,
        address: validatedData.address,
        email: validatedData.email || "",
        phone: validatedData.phone || "",
      })
      .where(eq(clients.id, clientId))

    console.log("Cliente actualizado:", clientId)

    return {
      success: true,
      clientId: clientId,
    }
  } catch (error) {
    console.error("Error al actualizar cliente:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos de formulario inválidos",
      }
    }

    return {
      success: false,
      error: "Error al actualizar el cliente",
    }
  }
}

// Acción para obtener clientes con estadísticas
export async function getClientsWithStats(businessId: string, userId?: string) {
  console.log("Obteniendo clientes con estadísticas para el negocio:", businessId)

  try {
    const db = await getDb()
    
    // Obtener todos los clientes del negocio
    let clientsList = await db.select().from(clients).where(eq(clients.businessId, businessId))

    // Si hay userId, filtrar por exclusiones
    if (userId) {
      const excludedClientIds = await db.select().from(userModuleExclusions)
        .where(
          and(
            eq(userModuleExclusions.userId, userId),
            eq(userModuleExclusions.businessId, businessId),
            eq(userModuleExclusions.module, "clients")
          )
        )
        .then(rows => rows.map(r => r.entityId));
      clientsList = clientsList.filter(c => !excludedClientIds.includes(c.id));
    }

    // Para cada cliente, calcular estadísticas basadas en sus facturas
    const clientsWithStats = await Promise.all(
      clientsList.map(async (client) => {
        // Obtener todas las facturas del cliente
        const clientInvoices = await db.select().from(invoices).where(eq(invoices.clientId, client.id))

        // Calcular totales
        const paidInvoices = clientInvoices.filter(invoice => invoice.status === "paid")
        const pendingInvoices = clientInvoices.filter(
          (invoice) => invoice.status !== "paid" && invoice.status !== "cancelled"
        )
        // Facturado solo pagado
        const totalInvoicedBase = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.subtotal), 0)
        const totalInvoicedIVA = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.taxAmount), 0)
        const totalInvoiced = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0)
        // Pendiente de cobro
        const totalPendingBase = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.subtotal), 0)
        const totalPendingIVA = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.taxAmount), 0)
        const totalPending = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0)
        const invoiceCount = clientInvoices.length

        // Debug
        console.log(`[getClientsWithStats] Cliente: ${client.name}, totalInvoicedBase:`, totalInvoicedBase, 'totalInvoicedIVA:', totalInvoicedIVA, 'totalPendingBase:', totalPendingBase, 'totalPendingIVA:', totalPendingIVA)

        // Determinar estado
        const status: "current" | "overdue" = totalPending > 0 ? "overdue" : "current"

        return {
          ...client,
          id: client.id.toString(),
          totalInvoiced,
          totalInvoicedBase,
          totalInvoicedIVA,
          totalPending,
          totalPendingBase,
          totalPendingIVA,
          invoiceCount,
          status,
        }
      }),
    )

    return clientsWithStats
  } catch (error) {
    console.error("Error al obtener clientes con estadísticas:", error)
    throw new Error("No se pudieron obtener los clientes")
  }
}

// Acción para obtener las facturas de un cliente
export async function getClientInvoices(clientId: string) {
  console.log("Obteniendo facturas del cliente:", clientId)

  try {
    const db = await getDb()
    
    const clientInvoices = await db.select().from(invoices).where(eq(invoices.clientId, clientId))

    return clientInvoices
  } catch (error) {
    console.error("Error al obtener facturas del cliente:", error)
    throw new Error("No se pudieron obtener las facturas del cliente")
  }
}

// Acción para obtener todos los clientes de un negocio
export async function getClients(businessId: string) {
  console.log("Obteniendo clientes del negocio:", businessId)

  try {
    const db = await getDb()
    
    const clientsList = await db.select().from(clients).where(eq(clients.businessId, businessId))

    return clientsList
  } catch (error) {
    console.error("Error al obtener clientes:", error)
    throw new Error("No se pudieron obtener los clientes")
  }
}

// Obtener clientes para el usuario actual (versión pública)
export async function getClientsForCurrentUser(businessId: string) {
  const user = await getCurrentUser()
  const userId = user?.id

  return getClientsWithStats(businessId, userId)
}
