"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { invoices, invoiceLines, clients, projects, Client, Project } from "@/app/db/schema"
import { eq, and, sql, gte, lte, or, like } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { createNotification } from "@/lib/notifications"

// Esquemas de validación
const invoiceLineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, { message: "La descripción es obligatoria" }),
  quantity: z.number().min(1, { message: "La cantidad debe ser al menos 1" }),
  unitPrice: z.number().min(0, { message: "El precio unitario debe ser positivo" }),
  taxRate: z.number().min(0, { message: "El porcentaje de impuestos debe ser positivo" }),
  total: z.number(),
})

const invoiceSchema = z.object({
  clientId: z.string().min(1, { message: "El cliente es obligatorio" }),
  projectId: z.string().optional(),
  date: z.date({ required_error: "La fecha es obligatoria" }),
  dueDate: z.date({ required_error: "La fecha de vencimiento es obligatoria" }),
  concept: z.string().min(1, { message: "El concepto es obligatorio" }),
  lines: z.array(invoiceLineSchema).min(1, { message: "Debe incluir al menos una línea" }),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

type InvoiceActionResult = {
  success: boolean
  error?: string
  invoiceId?: string
}

// Acción para crear una nueva factura
export async function createInvoice(formData: InvoiceFormData): Promise<InvoiceActionResult> {
  const db = await getDb()
  try {
    const validatedData = invoiceSchema.parse(formData)
    const business = await getActiveBusiness()
    if (!business) {
      return { success: false, error: "No hay un negocio activo seleccionado" }
    }

    const subtotal = validatedData.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    const taxAmount = validatedData.lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice
      return sum + lineTotal * (line.taxRate / 100)
    }, 0)
    const total = subtotal + taxAmount

    const number = `F${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${Math.floor(
      Math.random() * 1000,
    )
      .toString()
      .padStart(3, "0")}`

    const invoiceId = uuidv4()

    const [newInvoice] = await db
      .insert(invoices)
      .values({
        id: invoiceId,
        businessId: business.id,
        clientId: validatedData.clientId,
        projectId: validatedData.projectId || null,
        date: validatedData.date,
        dueDate: validatedData.dueDate,
        concept: validatedData.concept,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        status: "draft",
        number,
      })

    await db.insert(invoiceLines).values(
      validatedData.lines.map((line) => ({
        id: uuidv4(),
        invoiceId: invoiceId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toString(),
        taxRate: line.taxRate.toString(),
        total: (line.quantity * line.unitPrice).toString(),
      })),
    )

    // Crear notificación
    await createNotification({
      businessId: business.id,
      title: "Nueva factura emitida",
      message: `Factura #${number} · ${validatedData.concept} · ${total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} · ${validatedData.date.toLocaleDateString("es-ES")}`,
      type: "action",
    })

    revalidatePath("/invoices")
    return { success: true, invoiceId: invoiceId }
  } catch (error) {
    console.error("Error al crear factura:", error)
    return { success: false, error: error instanceof z.ZodError ? "Datos de formulario inválidos" : "Error al crear la factura" }
  }
}

// Acción para actualizar una factura existente
export async function updateInvoice(invoiceId: string, formData: InvoiceFormData): Promise<InvoiceActionResult> {
  const db = await getDb()
  try {
    const validatedData = invoiceSchema.parse(formData)
    const existingInvoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) })

    if (!existingInvoice) return { success: false, error: "Factura no encontrada" }
    if (existingInvoice.status === "paid" || existingInvoice.status === "cancelled") {
      return { success: false, error: "No se puede editar una factura pagada o cancelada" }
    }

    const subtotal = validatedData.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    const taxAmount = validatedData.lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice
      return sum + lineTotal * (line.taxRate / 100)
    }, 0)
    const total = subtotal + taxAmount

    await db
      .update(invoices)
      .set({
        clientId: validatedData.clientId,
        projectId: validatedData.projectId || null,
        date: validatedData.date,
        dueDate: validatedData.dueDate,
        concept: validatedData.concept,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
      })
      .where(eq(invoices.id, invoiceId))

    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId))

    await db.insert(invoiceLines).values(
      validatedData.lines.map((line) => ({
        id: uuidv4(),
        invoiceId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toString(),
        taxRate: line.taxRate.toString(),
        total: (line.quantity * line.unitPrice).toString(),
      })),
    )

    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    return { success: true, invoiceId }
  } catch (error) {
    console.error("Error al actualizar factura:", error)
    return { success: false, error: error instanceof z.ZodError ? "Datos de formulario inválidos" : "Error al actualizar la factura" }
  }
}

// Acción para cambiar el estado de una factura
export async function updateInvoiceStatus(invoiceId: string, status: "draft" | "sent" | "paid" | "overdue" | "cancelled"): Promise<InvoiceActionResult> {
  const db = await getDb()
  try {
    await db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId))
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    return { success: true, invoiceId }
  } catch (error) {
    console.error("Error al actualizar estado de factura:", error)
    return { success: false, error: "Error al actualizar el estado de la factura" }
  }
}

// Acción para eliminar una factura
export async function deleteInvoice(invoiceId: string): Promise<InvoiceActionResult> {
  const db = await getDb()
  try {
    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId))
    await db.delete(invoices).where(eq(invoices.id, invoiceId))
    revalidatePath("/invoices")
    return { success: true }
  } catch (error) {
    console.error("Error al eliminar factura:", error)
    return { success: false, error: "Error al eliminar la factura" }
  }
}

// Obtener facturas con filtros
export async function getInvoices({
  businessId,
  status,
  clientId,
  startDate,
  endDate,
  searchTerm,
}: {
  businessId: string
  status?: string
  clientId?: string
  startDate?: Date
  endDate?: Date
  searchTerm?: string
}) {
  const db = await getDb()
  try {
    const whereClauses = [eq(invoices.businessId, businessId)]
    if (status) whereClauses.push(eq(invoices.status, status))
    if (clientId) whereClauses.push(eq(invoices.clientId, clientId))
    if (startDate) whereClauses.push(gte(invoices.date, startDate))
    if (endDate) whereClauses.push(lte(invoices.date, endDate))
    if (searchTerm) {
      whereClauses.push(
        or(
          like(invoices.number, `%${searchTerm}%`),
          like(invoices.concept, `%${searchTerm}%`),
          like(clients.name, `%${searchTerm}%`),
        ),
      )
    }

    const allInvoices = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        clientName: clients.name,
        date: invoices.date,
        dueDate: invoices.dueDate,
        total: invoices.total,
        status: invoices.status,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...whereClauses))
      .orderBy(sql`${invoices.date} desc`)

    return allInvoices
  } catch (error) {
    console.error("Error al obtener facturas:", error)
    throw new Error("No se pudieron obtener las facturas")
  }
}

// Obtener una factura con sus líneas
export async function getInvoiceWithLines(invoiceId: string) {
  const db = await getDb()
  try {
    console.log(`[getInvoiceWithLines] Buscando factura con ID: ${invoiceId}`)
    
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: {
        lines: true,
        client: true,
        project: true,
      },
    })
    
    console.log(`[getInvoiceWithLines] Resultado de la consulta:`, invoice)
    
    if (!invoice) {
      console.log(`[getInvoiceWithLines] Factura no encontrada`)
      throw new Error("Factura no encontrada")
    }
    
    console.log(`[getInvoiceWithLines] Factura encontrada con ${invoice.lines?.length || 0} líneas`)
    return invoice
  } catch (error) {
    console.error("Error al obtener factura con líneas:", error)
    throw new Error("No se pudo obtener la factura")
  }
}

// Obtener clientes de un negocio
export async function getClientsForBusiness(businessId: string): Promise<Client[]> {
  const db = await getDb()
  try {
    const clientList = await db.query.clients.findMany({
      where: eq(clients.businessId, businessId),
      orderBy: sql`${clients.name} asc`,
    })
    return clientList
  } catch (error) {
    console.error("Error al obtener clientes:", error)
    throw new Error("No se pudieron obtener los clientes")
  }
}

// Obtener proyectos de un negocio
export async function getProjectsForBusiness(businessId: string): Promise<Project[]> {
  const db = await getDb()
  try {
    const projectList = await db.query.projects.findMany({
      where: eq(projects.businessId, businessId),
      orderBy: sql`${projects.name} asc`,
    })
    return projectList
  } catch (error) {
    console.error("Error al obtener proyectos:", error)
    throw new Error("No se pudieron obtener los proyectos")
  }
}
