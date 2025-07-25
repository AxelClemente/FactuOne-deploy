"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq, gte, like, lte, or } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { receivedInvoices, userModuleExclusions } from "@/app/db/schema"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"
import { createNotification } from "@/lib/notifications"
import { providers } from "@/app/db/schema"
import { receivedInvoiceLines } from "@/app/db/schema"

// Esquemas de validación
const receivedInvoiceSchema = z.object({
  date: z.date(),
  providerId: z.string().min(1, { message: "Selecciona un proveedor" }),
  amount: z.coerce.number().min(0, { message: "El importe debe ser positivo" }),
  status: z.enum(["pending", "recorded", "rejected", "paid"]),
  category: z.string().optional(),
  documentUrl: z.string().optional(),
  number: z.string().optional(),
  projectId: z.string().optional(),
  // Campos del método de pago
  paymentMethod: z.enum(["bank", "bizum", "cash"]).optional(),
  bankId: z.string().optional(),
  bizumHolder: z.string().optional(),
  bizumNumber: z.string().optional(),
  lines: z.array(z.object({
    description: z.string().min(1, { message: "La descripción es obligatoria" }),
    quantity: z.number().min(0.01, { message: "La cantidad debe ser positiva" }),
    unitPrice: z.number().min(0.01, { message: "El precio unitario debe ser positivo" }),
    taxRate: z.number().optional(),
    total: z.number().optional(),
  })).optional(),
})

type ReceivedInvoiceFormData = z.infer<typeof receivedInvoiceSchema>

type ReceivedInvoiceActionResult = {
  success: boolean
  error?: string
  invoiceId?: string
}

// Acción para crear una nueva factura recibida
export async function createReceivedInvoice(formData: ReceivedInvoiceFormData): Promise<ReceivedInvoiceActionResult> {
  try {
    // Obtener usuario actual y comprobar permiso
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No has iniciado sesión" };
    }
    
    const activeBusinessId = await getActiveBusiness()
    if (!activeBusinessId) {
      return { success: false, error: "No hay un negocio activo seleccionado" }
    }

    const canCreate = await hasPermission(user.id, activeBusinessId.toString(), "received_invoices", "create");
    if (!canCreate) {
      return { success: false, error: "No tienes permisos para crear facturas recibidas" };
    }

    const validatedData = receivedInvoiceSchema.parse(formData)
    const db = await getDb()

    // Obtener datos del proveedor seleccionado
    const [provider] = await db.select().from(providers).where(eq(providers.id, validatedData.providerId))
    if (!provider) {
      return { success: false, error: "Proveedor no encontrado" }
    }

    // Calcular la fecha de vencimiento (30 días después de la fecha de emisión)
    const dueDate = new Date(validatedData.date)
    dueDate.setDate(dueDate.getDate() + 30)

    const id = uuidv4(); // Genera el UUID aquí

    await db.insert(receivedInvoices).values({
      id, // Usa el UUID aquí
      providerId: validatedData.providerId,
      providerName: provider.name,
      providerNIF: provider.nif,
      businessId: activeBusinessId,
      date: validatedData.date,
      amount: validatedData.amount,
      status: validatedData.status,
      category: validatedData.category,
      documentUrl: validatedData.documentUrl,
      number: validatedData.number || `G-${Date.now()}`,
      taxAmount: 0,
      total: validatedData.amount,
      dueDate: dueDate, // Añadir la fecha de vencimiento
      projectId: validatedData.projectId || null,
      // Campos del método de pago
      paymentMethod: validatedData.paymentMethod || null,
      bankId: validatedData.bankId || null,
      bizumHolder: validatedData.bizumHolder || null,
      bizumNumber: validatedData.bizumNumber || null,
    })

    // Crear las líneas de la factura recibida si existen
    if (validatedData.lines && validatedData.lines.length > 0) {
      const linesToInsert = validatedData.lines.map((line: any) => ({
        id: uuidv4(),
        receivedInvoiceId: id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        total: line.total || (line.quantity * line.unitPrice),
      }))
      
      await db.insert(receivedInvoiceLines).values(linesToInsert)
    }

    // Crear notificación
    await createNotification({
      businessId: activeBusinessId,
      title: "Nueva factura recibida",
      message: `Factura: ${validatedData.number || `G-${Date.now()}`} · Proveedor: ${provider.name} · ${new Date().toLocaleDateString("es-ES")}`,
      type: "action",
    })

    revalidatePath("/received-invoices")
    return { success: true, invoiceId: id } // Devuelve el UUID aquí
  } catch (error) {
    console.error("Error al crear factura recibida:", error)
    return { success: false, error: "Error al crear la factura recibida" }
  }
}

// Acción para actualizar una factura recibida existente
export async function updateReceivedInvoice(
  invoiceId: string,
  formData: ReceivedInvoiceFormData,
): Promise<ReceivedInvoiceActionResult> {
  const db = await getDb()
  try {
    const validatedData = receivedInvoiceSchema.parse(formData)

    await db.update(receivedInvoices).set({
      ...validatedData,
      projectId: validatedData.projectId || null,
      // Campos del método de pago
      paymentMethod: validatedData.paymentMethod || null,
      bankId: validatedData.bankId || null,
      bizumHolder: validatedData.bizumHolder || null,
      bizumNumber: validatedData.bizumNumber || null,
    }).where(eq(receivedInvoices.id, invoiceId))

    // Actualizar las líneas de la factura recibida
    if (validatedData.lines) {
      // Eliminar líneas existentes
      await db.delete(receivedInvoiceLines).where(eq(receivedInvoiceLines.receivedInvoiceId, invoiceId))
      
      // Insertar nuevas líneas
      if (validatedData.lines.length > 0) {
        const linesToInsert = validatedData.lines.map((line: any) => ({
          id: uuidv4(),
          receivedInvoiceId: invoiceId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          total: line.total || (line.quantity * line.unitPrice),
        }))
        
        await db.insert(receivedInvoiceLines).values(linesToInsert)
      }
    }

    revalidatePath(`/received-invoices/${invoiceId}`)
    revalidatePath("/received-invoices")
    return { success: true, invoiceId: invoiceId }
  } catch (error) {
    console.error("Error al actualizar factura recibida:", error)
    return { success: false, error: "Error al actualizar la factura recibida" }
  }
}

// Acción para cambiar el estado de una factura recibida
export async function updateReceivedInvoiceStatus(
  invoiceId: string,
  status: "pending" | "recorded" | "rejected" | "paid",
): Promise<ReceivedInvoiceActionResult> {
  const db = await getDb()
  try {
    await db.update(receivedInvoices).set({ status }).where(eq(receivedInvoices.id, invoiceId))

    revalidatePath(`/received-invoices/${invoiceId}`)
    revalidatePath("/received-invoices")
    return { success: true, invoiceId: invoiceId }
  } catch (error) {
    console.error("Error al actualizar estado de factura recibida:", error)
    return { success: false, error: "Error al actualizar el estado de la factura recibida" }
  }
}

// Acción para eliminar una factura recibida
export async function deleteReceivedInvoice(invoiceId: string): Promise<ReceivedInvoiceActionResult> {
  const db = await getDb()
  try {
    await db.update(receivedInvoices).set({ isDeleted: true }).where(eq(receivedInvoices.id, invoiceId))
    revalidatePath("/received-invoices")
    return { success: true }
  } catch (error) {
    console.error("Error al eliminar factura recibida:", error)
    return { success: false, error: "Error al eliminar la factura recibida" }
  }
}

// Función para obtener facturas recibidas con filtros
export async function getReceivedInvoices({
  businessId,
  status,
  category,
  startDate,
  endDate,
  searchTerm,
  providerId,
  userId,
}: {
  businessId: string | number
  status?: string
  category?: string
  startDate?: Date
  endDate?: Date
  searchTerm?: string
  providerId?: string
  userId?: string
}) {
  const db = await getDb()
  try {
    // Si businessId es string y es numérico, conviértelo; si no, úsalo como string
    let businessIdValue: any = businessId
    if (typeof businessId === 'string' && !isNaN(Number(businessId))) {
      businessIdValue = Number(businessId).toString()
    }
    const conditions = [eq(receivedInvoices.businessId, businessIdValue), eq(receivedInvoices.isDeleted, false)]

    if (status && status !== "all") {
      conditions.push(eq(receivedInvoices.status, status as any))
    }
    if (category && category !== "all") {
      conditions.push(eq(receivedInvoices.category, category))
    }
    if (startDate) {
      conditions.push(gte(receivedInvoices.date, startDate))
    }
    if (endDate) {
      conditions.push(lte(receivedInvoices.date, endDate))
    }
    if (searchTerm) {
      conditions.push(
        or(
          like(receivedInvoices.providerId, `%${searchTerm}%`),
          like(receivedInvoices.number, `%${searchTerm}%`),
        ),
      )
    }
    if (providerId) {
      conditions.push(eq(receivedInvoices.providerId, providerId))
    }

    let invoices = await db.select().from(receivedInvoices).where(and(...conditions))

    // Si hay userId, filtrar por exclusiones de proveedores y proyectos
    if (userId) {
      // Obtener exclusiones de proveedores
      const excludedProviderIds = await db.select().from(userModuleExclusions)
        .where(
          and(
            eq(userModuleExclusions.userId, userId),
            eq(userModuleExclusions.businessId, businessIdValue),
            eq(userModuleExclusions.module, "providers")
          )
        )
        .then(rows => rows.map(r => r.entityId));

      // Obtener exclusiones de proyectos
      const excludedProjectIds = await db.select().from(userModuleExclusions)
        .where(
          and(
            eq(userModuleExclusions.userId, userId),
            eq(userModuleExclusions.businessId, businessIdValue),
            eq(userModuleExclusions.module, "projects")
          )
        )
        .then(rows => rows.map(r => r.entityId));

      // Filtrar facturas que no estén asociadas a proveedores o proyectos excluidos
      invoices = invoices.filter(invoice => {
        const isProviderExcluded = excludedProviderIds.includes(invoice.providerId);
        const isProjectExcluded = invoice.projectId && excludedProjectIds.includes(invoice.projectId);
        return !isProviderExcluded && !isProjectExcluded;
      });
    }

    return invoices
  } catch (error) {
    console.error("Error al obtener facturas recibidas:", error)
    throw new Error("No se pudieron obtener las facturas recibidas")
  }
}

// Obtener facturas recibidas para el usuario actual (versión pública)
export async function getReceivedInvoicesForCurrentUser({
  businessId,
  status,
  category,
  startDate,
  endDate,
  searchTerm,
  providerId,
}: {
  businessId: string | number
  status?: string
  category?: string
  startDate?: Date
  endDate?: Date
  searchTerm?: string
  providerId?: string
}) {
  const user = await getCurrentUser()
  const userId = user?.id

  return getReceivedInvoices({
    businessId,
    status,
    category,
    startDate,
    endDate,
    searchTerm,
    providerId,
    userId,
  })
}

// Función para obtener una factura recibida por su ID
export async function getReceivedInvoiceById(invoiceId: string) {
  const db = await getDb()
  try {
    const invoice = await db.query.receivedInvoices.findFirst({
      where: eq(receivedInvoices.id, invoiceId),
      with: {
        lines: true,
        provider: true,
        project: true,
        bank: true, // Agregar relación con el banco
      },
    })
    return invoice
  } catch (error) {
    console.error(`Error al obtener la factura recibida ${invoiceId}:`, error)
    return null
  }
}

// Acción para obtener las categorías de gastos de un negocio
export async function getExpenseCategories() {
  const db = await getDb()
  try {
    const activeBusinessId = await getActiveBusiness()
    if (!activeBusinessId) return []

    // Permitir string o número
    let businessIdValue: any = activeBusinessId
    if (typeof activeBusinessId === 'string' && !isNaN(Number(activeBusinessId))) {
      businessIdValue = Number(activeBusinessId).toString()
    }

    const categories = await db
      .selectDistinct({ category: receivedInvoices.category })
      .from(receivedInvoices)
      .where(and(eq(receivedInvoices.businessId, businessIdValue), eq(receivedInvoices.isDeleted, false)))
      .orderBy(receivedInvoices.category)

    return categories.map((c) => c.category).filter(Boolean) as string[]
  } catch (error) {
    console.error("Error al obtener las categorías de gastos:", error)
    return []
  }
}
