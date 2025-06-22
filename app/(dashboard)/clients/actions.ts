"use server"

import { z } from "zod"
import { getDb } from "@/lib/db"
import { clients, invoices } from "@/app/db/schema"
import { eq, and, ne } from "drizzle-orm"

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
    // Validar los datos del formulario
    const validatedData = clientSchema.parse(formData)
    const db = await getDb()

    // Verificar si ya existe un cliente con el mismo NIF en este negocio
    const existingClient = await db.select().from(clients).where(
      and(
        eq(clients.businessId, parseInt(businessId)),
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
    const [newClient] = await db.insert(clients).values({
      businessId: parseInt(businessId),
      name: validatedData.name,
      nif: validatedData.nif,
      address: validatedData.address,
      email: validatedData.email || "",
      phone: validatedData.phone || "",
    })

    console.log("Cliente creado:", newClient.insertId)

    return {
      success: true,
      clientId: newClient.insertId.toString(),
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
    const currentClient = await db.select().from(clients).where(eq(clients.id, parseInt(clientId))).limit(1)

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
        ne(clients.id, parseInt(clientId))
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
      .where(eq(clients.id, parseInt(clientId)))

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
export async function getClientsWithStats(businessId: string) {
  console.log("Obteniendo clientes con estadísticas para el negocio:", businessId)

  try {
    const db = await getDb()
    
    // Obtener todos los clientes del negocio
    const clientsList = await db.select().from(clients).where(eq(clients.businessId, parseInt(businessId)))

    // Para cada cliente, calcular estadísticas basadas en sus facturas
    const clientsWithStats = await Promise.all(
      clientsList.map(async (client) => {
        // Obtener todas las facturas del cliente
        const clientInvoices = await db.select().from(invoices).where(eq(invoices.clientId, client.id))

        // Calcular totales
        const totalInvoiced = clientInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0)
        const pendingInvoices = clientInvoices.filter(
          (invoice) => invoice.status === "sent" || invoice.status === "overdue",
        )
        const totalPending = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0)
        const invoiceCount = clientInvoices.length

        // Determinar estado
        const status = totalPending > 0 ? "overdue" : "current"

        return {
          ...client,
          totalInvoiced,
          totalPending,
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
    
    const clientInvoices = await db.select().from(invoices).where(eq(invoices.clientId, parseInt(clientId)))

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
    
    const clientsList = await db.select().from(clients).where(eq(clients.businessId, parseInt(businessId)))

    return clientsList
  } catch (error) {
    console.error("Error al obtener clientes:", error)
    throw new Error("No se pudieron obtener los clientes")
  }
}
