"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { invoices, invoiceLines, clients, projects, Client, Project, userModuleExclusions } from "@/app/db/schema"
import { eq, and, sql, gte, lte, or, like } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { createNotification } from "@/lib/notifications"
import { auditHelpers } from "@/lib/audit"
import { VerifactuService } from "@/lib/verifactu-service"
import { getBanksWithStats } from "@/app/(dashboard)/banks/actions"

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
  // Campos de método de pago
  paymentMethod: z.enum(["bank", "bizum", "cash"]).optional(),
  bankId: z.string().optional(),
  bizumHolder: z.string().optional(),
  bizumNumber: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

type InvoiceActionResult = {
  success: boolean
  error?: string
  invoiceId?: string
}

// Acción para crear una nueva factura
export async function createInvoice(formData: InvoiceFormData): Promise<InvoiceActionResult> {
  try {
    // Obtener usuario actual y comprobar permiso
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No has iniciado sesión" };
    }
    
    const business = await getActiveBusiness()
    if (!business) {
      return { success: false, error: "No hay un negocio activo seleccionado" }
    }

    const canCreate = await hasPermission(user.id, business.id.toString(), "invoices", "create");
    if (!canCreate) {
      return { success: false, error: "No tienes permisos para crear facturas" };
    }

    const validatedData = invoiceSchema.parse(formData)
    const db = await getDb()

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
        // Campos de método de pago
        paymentMethod: validatedData.paymentMethod || null,
        bankId: validatedData.bankId || null,
        bizumHolder: validatedData.bizumHolder || null,
        bizumNumber: validatedData.bizumNumber || null,
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

    // Registrar evento de auditoría
    await auditHelpers.logInvoiceCreated(invoiceId, {
      number,
      concept: validatedData.concept,
      total: total.toString(),
      clientId: validatedData.clientId,
      projectId: validatedData.projectId,
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
        // Campos de método de pago
        paymentMethod: validatedData.paymentMethod || null,
        bankId: validatedData.bankId || null,
        bizumHolder: validatedData.bizumHolder || null,
        bizumNumber: validatedData.bizumNumber || null,
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

    // Registrar evento de auditoría
    await auditHelpers.logInvoiceUpdated(invoiceId, {
      concept: validatedData.concept,
      total: total.toString(),
      clientId: validatedData.clientId,
      projectId: validatedData.projectId,
      previousTotal: existingInvoice.total,
    })

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
    const existingInvoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) })
    if (!existingInvoice) {
      return { success: false, error: "Factura no encontrada" }
    }

    console.log('💰 Actualizando estado de factura:', { invoiceId, oldStatus: existingInvoice.status, newStatus: status })
    
    await db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId))
    
    // 🎯 INTEGRACIÓN VERI*FACTU: Crear registro cuando se marca como pagada
    if (status === "paid" && existingInvoice.status !== "paid") {
      console.log('✨ VERI*FACTU: Factura marcada como pagada, creando registro...')
      try {
        const businessId = existingInvoice.businessId
        
        // Verificar si VERI*FACTU está habilitado para este negocio
        const verifactuConfig = await VerifactuService.getConfig(businessId)
        
        if (verifactuConfig?.enabled) {
          console.log('🔥 VERI*FACTU habilitado, creando registro...')
          
          const registry = await VerifactuService.createRegistry({
            invoiceId,
            invoiceType: 'sent',
            businessId
          })
          
          console.log('✅ Registro VERI*FACTU creado:', registry.id)
        } else {
          console.log('⚠️ VERI*FACTU no está habilitado para este negocio')
        }
      } catch (verifactuError) {
        console.error('❌ Error creando registro VERI*FACTU:', verifactuError)
        // No fallar la actualización por errores de VERI*FACTU
      }
    }
    
    // Registrar evento de auditoría
    await auditHelpers.logInvoiceStatusChanged(invoiceId, existingInvoice.status, status)

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
  userId,
}: {
  businessId: string
  status?: string
  clientId?: string
  startDate?: Date
  endDate?: Date
  searchTerm?: string
  userId?: string
}) {
  const db = await getDb()
  try {
    const whereClauses = [eq(invoices.businessId, businessId)]
    if (status) whereClauses.push(eq(invoices.status, status))
    if (clientId) whereClauses.push(eq(invoices.clientId, clientId))
    // Simplificar la lógica de fechas - usar directamente las fechas que vienen del frontend
    if (startDate) {
      console.log("[ACTIONS] StartDate recibida:", startDate.toISOString())
      whereClauses.push(gte(invoices.date, startDate))
    }
    if (endDate) {
      console.log("[ACTIONS] EndDate recibida:", endDate.toISOString())
      whereClauses.push(lte(invoices.date, endDate))
    }
    if (searchTerm) {
      const searchValue = `%${searchTerm.toLowerCase()}%`
      whereClauses.push(
        or(
          like(invoices.number, searchValue),
          like(invoices.concept, searchValue),
          like(clients.name, searchValue),
        ),
      )
    }

    let allInvoices = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        clientName: clients.name,
        clientId: invoices.clientId,
        projectId: invoices.projectId,
        date: invoices.date,
        dueDate: invoices.dueDate,
        total: invoices.total,
        status: invoices.status,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...whereClauses))
      .orderBy(sql`${invoices.date} desc`)

    // Log para debugging
    console.log("[ACTIONS] Total facturas encontradas:", allInvoices.length)
    allInvoices.forEach(invoice => {
      console.log(`[ACTIONS] Factura ${invoice.number}: ${invoice.date}`)
    })

    // Si hay userId, filtrar por exclusiones de clientes y proyectos
    if (userId) {
      // Obtener exclusiones de clientes
      const excludedClientIds = await db.select().from(userModuleExclusions)
        .where(
          and(
            eq(userModuleExclusions.userId, userId),
            eq(userModuleExclusions.businessId, businessId),
            eq(userModuleExclusions.module, "clients")
          )
        )
        .then(rows => rows.map(r => r.entityId));

      // Obtener exclusiones de proyectos
      const excludedProjectIds = await db.select().from(userModuleExclusions)
        .where(
          and(
            eq(userModuleExclusions.userId, userId),
            eq(userModuleExclusions.businessId, businessId),
            eq(userModuleExclusions.module, "projects")
          )
        )
        .then(rows => rows.map(r => r.entityId));

      // Filtrar facturas que no estén asociadas a clientes o proyectos excluidos
      allInvoices = allInvoices.filter(invoice => {
        const isClientExcluded = excludedClientIds.includes(invoice.clientId);
        const isProjectExcluded = invoice.projectId && excludedProjectIds.includes(invoice.projectId);
        return !isClientExcluded && !isProjectExcluded;
      });
    }

    return allInvoices
  } catch (error) {
    console.error("Error al obtener facturas:", error)
    throw new Error("No se pudieron obtener las facturas")
  }
}

// Obtener facturas para el usuario actual (versión pública)
export async function getInvoicesForCurrentUser({
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
  const user = await getCurrentUser()
  const userId = user?.id

  return getInvoices({
    businessId,
    status,
    clientId,
    startDate,
    endDate,
    searchTerm,
    userId,
  })
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
        bank: true, // Agregar relación con el banco
      },
    })
    
    console.log(`[getInvoiceWithLines] Resultado de la consulta:`, {
      id: invoice?.id,
      number: invoice?.number,
      paymentMethod: invoice?.paymentMethod,
      bankId: invoice?.bankId,
      bizumHolder: invoice?.bizumHolder,
      bizumNumber: invoice?.bizumNumber,
      bank: invoice?.bank ? {
        id: invoice.bank.id,
        bankName: invoice.bank.bankName,
        accountNumber: invoice.bank.accountNumber,
        accountHolder: invoice.bank.accountHolder
      } : null,
      linesCount: invoice?.lines?.length || 0
    })
    
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

// Obtener facturas asociadas a un proyecto con filtro
export async function getInvoicesForProject({
  projectId,
  search = "",
  filterBy = "number",
}: {
  projectId: string
  search?: string
  filterBy?: "number" | "concept" | "total"
}) {
  const db = await getDb()
  try {
    let whereClause = eq(invoices.projectId, projectId)
    let filter = undefined
    if (search) {
      const searchValue = `%${search.toLowerCase()}%`
      if (filterBy === "number") {
        filter = sql`LOWER(${invoices.number}) = ${search.toLowerCase().trim()}`
      } else if (filterBy === "concept") {
        filter = sql`LOWER(${invoices.concept}) LIKE ${searchValue}`
      } else if (filterBy === "total") {
        // Normaliza el input: quita espacios, cambia coma por punto
        const normalized = search.replace(/,/g, ".").replace(/\s/g, "")
        const totalSearch = `%${normalized}%`
        filter = sql`CAST(${invoices.total} AS CHAR) LIKE ${totalSearch}`
      }
    }
    const where = filter ? and(whereClause, filter) : whereClause
    const result = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        concept: invoices.concept,
        total: invoices.total,
        date: invoices.date,
        status: invoices.status,
      })
      .from(invoices)
      .where(where)
      .orderBy(sql`${invoices.date} desc`)
    return result
  } catch (error) {
    console.error("Error al obtener facturas del proyecto:", error)
    throw new Error("No se pudieron obtener las facturas del proyecto")
  }
}

export async function getBanksForBusiness(businessId: string) {
  console.log("[INVOICES ACTIONS] getBanksForBusiness - businessId:", businessId)

  try {
    const banks = await getBanksWithStats(businessId, "")
    return banks
  } catch (error) {
    console.error("[INVOICES ACTIONS] Error obteniendo bancos:", error)
    return []
  }
}
