"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq, gte, like, lte, sql } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { projects, clients, invoices, receivedInvoices } from "@/app/db/schema"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { uploadContract } from "@/lib/upload"
import { v4 as uuidv4 } from "uuid"
import { createNotification } from "@/lib/notifications"

// Esquema de validación para los datos EXTRAÍDOS del FormData
const projectSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  clientId: z.string().nullable().optional(),
  status: z.enum(["pending", "won", "lost"]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  contract: z.instanceof(File).optional().nullable(),
})

// Tipos para las acciones
type ProjectActionResult = {
  id?: string
  error?: string
  success?: boolean
}

// Crear un nuevo proyecto
export async function createProject(formData: FormData): Promise<ProjectActionResult> {
  try {
    // Obtener usuario actual y comprobar permiso
    const user = await getCurrentUser();
    if (!user) {
      return { error: "No has iniciado sesión" };
    }
    
    const businessId = await getActiveBusiness()
    if (!businessId) {
      return { error: "No hay un negocio activo seleccionado" }
    }

    const canCreate = await hasPermission(user.id, businessId.toString(), "projects", "create");
    if (!canCreate) {
      return { error: "No tienes permisos para crear proyectos" };
    }

    const db = await getDb()

    // 1. Extraer y preparar datos del FormData
    const rawData = {
      name: formData.get("name"),
      status: formData.get("status"),
      clientId: formData.get("clientId") === "none" ? null : formData.get("clientId"),
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      contract: formData.get("contract"),
    }

    // 2. Validar los datos extraídos
    const validatedData = projectSchema.parse(rawData)

    // 3. Crear el proyecto en la BD (sin la URL del contrato todavía)
    const projectId = uuidv4()
    await db
      .insert(projects)
      .values({
        id: projectId,
        name: validatedData.name,
        status: validatedData.status,
        clientId: validatedData.clientId,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        businessId: businessId,
      })

    // Crear notificación
    await createNotification({
      businessId,
      title: "Nuevo proyecto creado",
      message: `Proyecto: ${validatedData.name} · Estado: ${validatedData.status} · ${new Date().toLocaleDateString("es-ES")}`,
      type: "action",
    })

    // 4. Subir el archivo si existe
    let contractUrl: string | undefined = undefined
    if (validatedData.contract && validatedData.contract.size > 0) {
      contractUrl = await uploadContract(validatedData.contract, projectId)
      // 5. Actualizar el proyecto con la URL del contrato
      await db.update(projects).set({ contractUrl }).where(eq(projects.id, projectId))
    }

    revalidatePath("/projects")
    return { id: projectId, success: true }
  } catch (error) {
    console.error("❌ Error creando proyecto:", error)
    if (error instanceof z.ZodError) {
      return { error: "Datos del formulario inválidos. Por favor, revisa los campos." };
    }
    return { error: "Error al crear el proyecto" }
  }
}

// Actualizar un proyecto existente
export async function updateProject(projectId: string, formData: FormData): Promise<ProjectActionResult> {
  const db = await getDb()
  try {
    const rawData = {
      name: formData.get("name"),
      status: formData.get("status"),
      // Si el cliente es "none" o no se envía, lo tratamos como nulo
      clientId: formData.get("clientId") === "none" ? null : formData.get("clientId"),
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      contract: formData.get("contract"),
    }

    const validatedData = projectSchema.parse(rawData)

    const { contract, ...dataForDb } = validatedData

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: { [key: string]: any } = { ...dataForDb }

    if (contract instanceof File && contract.size > 0) {
      const contractUrl = await uploadContract(contract, projectId)
      updatePayload.contractUrl = contractUrl
    }

    await db.update(projects).set(updatePayload).where(eq(projects.id, projectId))

    revalidatePath("/projects")
    revalidatePath(`/projects/${projectId}`)
    return { id: projectId, success: true }
  } catch (error) {
    console.error("❌ Error actualizando proyecto:", error)
    if (error instanceof z.ZodError) {
      // Proporcionar un mensaje de error más detallado en el servidor
      console.error("Error de validación de Zod:", error.flatten().fieldErrors)
      return { error: "Datos del formulario inválidos. Por favor, revisa los campos." }
    }
    return { error: "Error al actualizar el proyecto" }
  }
}

// Eliminar un proyecto (borrado lógico)
export async function deleteProject(projectId: string): Promise<ProjectActionResult> {
  const db = await getDb()
  try {
    await db.update(projects).set({ isDeleted: true }).where(eq(projects.id, projectId))
    revalidatePath("/projects")
    return { success: true }
  } catch (error) {
    console.error("Error eliminando proyecto:", error)
    return { error: "Error al eliminar el proyecto" }
  }
}

// Cambiar el estado de un proyecto
export async function changeProjectStatus(id: string, status: "won" | "lost" | "pending"): Promise<ProjectActionResult> {
  const db = await getDb()
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    return { error: "No hay negocio activo" }
  }

  const businessId = activeBusiness

  try {
    await db
      .update(projects)
      .set({ status })
      .where(and(eq(projects.id, id), eq(projects.businessId, businessId)))
    revalidatePath(`/projects/${id}`)
    revalidatePath("/projects")
    return { success: true }
  } catch (error) {
    console.error("Error al cambiar estado del proyecto:", error)
    return { success: false, error: "Error al cambiar el estado del proyecto" }
  }
}

// Obtener proyectos con filtros
export async function getProjects({
  status,
  clientId,
  startDate,
  endDate,
  search,
}: {
  status?: string
  clientId?: string
  startDate?: string
  endDate?: string
  search?: string
} = {}) {
  const db = await getDb()
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    return []
  }

  const businessId = activeBusiness

  try {
    const conditions = [
      eq(projects.businessId, businessId),
      eq(projects.isDeleted, false),
    ]

    if (status && status !== "all") {
      conditions.push(eq(projects.status, status as "won" | "lost" | "pending"))
    }
    if (clientId) {
      conditions.push(eq(projects.clientId, clientId))
    }
    if (startDate) {
      conditions.push(gte(projects.startDate, new Date(startDate)))
    }
    if (endDate) {
      conditions.push(lte(projects.endDate, new Date(endDate)))
    }
    if (search) {
      conditions.push(like(projects.name, `%${search}%`))
    }

    const projectList = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        clientId: projects.clientId,
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(...conditions))

    return projectList
  } catch (error) {
    console.error("Error obteniendo proyectos:", error)
    return []
  }
}

// Obtener un proyecto por su ID
export async function getProjectById(projectId: string) {
  const db = await getDb()
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    return null
  }

  const businessId = activeBusiness

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.businessId, businessId)))
    return project || null
  } catch (error) {
    console.error("Error obteniendo proyecto por ID:", error)
    return null
  }
}

// Obtener las facturas asociadas a un proyecto
export async function getProjectInvoices(projectId: string) {
  const db = await getDb()
  try {
    return await db
      .select()
      .from(invoices)
      // Esta relación no existe directamente en el esquema. Se necesitaría añadir un campo projectId a la tabla invoices
      // .where(eq(invoices.projectId, projectId))
      .limit(0) // De momento devolvemos un array vacío para no causar un error
  } catch (error) {
    console.error("Error obteniendo facturas del proyecto:", error)
    return []
  }
}

// Obtener facturas recibidas asociadas a un proyecto con filtro
export async function getReceivedInvoicesForProject({
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
    let whereClause = eq(receivedInvoices.projectId, projectId)
    let filter = undefined
    if (search) {
      const searchValue = `%${search.toLowerCase()}%`
      if (filterBy === "number") {
        filter = sql`LOWER(${receivedInvoices.number}) = ${search.toLowerCase().trim()}`
      } else if (filterBy === "concept") {
        filter = sql`LOWER(${receivedInvoices.category}) LIKE ${searchValue}`
      } else if (filterBy === "total") {
        // Normaliza el input: quita espacios, cambia coma por punto
        const normalized = search.replace(/,/g, ".").replace(/\s/g, "")
        const totalSearch = `%${normalized}%`
        filter = sql`CAST(${receivedInvoices.total} AS CHAR) LIKE ${totalSearch}`
      }
    }
    const where = filter ? and(whereClause, filter) : whereClause
    const result = await db
      .select({
        id: receivedInvoices.id,
        number: receivedInvoices.number,
        concept: receivedInvoices.category, // No hay campo concept, usamos category
        total: receivedInvoices.total,
        date: receivedInvoices.date,
        status: receivedInvoices.status,
      })
      .from(receivedInvoices)
      .where(where)
      .orderBy(sql`${receivedInvoices.date} desc`)
    return result
  } catch (error) {
    console.error("Error al obtener facturas recibidas del proyecto:", error)
    throw new Error("No se pudieron obtener las facturas recibidas del proyecto")
  }
}