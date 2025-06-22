"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq, gte, like, lte } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { projects, clients, invoices } from "@/app/db/schema"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { uploadContract } from "@/lib/upload"

// Esquema de validación para los datos EXTRAÍDOS del FormData
const projectSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  clientId: z.coerce.number().optional(),
  status: z.enum(["pending", "won", "lost"]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  contract: z.instanceof(File).optional().nullable(),
})

// Tipos para las acciones
type ProjectActionResult = {
  id?: number
  error?: string
  success?: boolean
}

// Crear un nuevo proyecto
export async function createProject(formData: FormData): Promise<ProjectActionResult> {
  const db = await getDb()
  const businessId = await getActiveBusiness()
  if (!businessId) {
    return { error: "No hay un negocio activo seleccionado" }
  }

  try {
    // 1. Extraer y preparar datos del FormData
    const rawData = {
      name: formData.get("name"),
      status: formData.get("status"),
      clientId: formData.get("clientId"),
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      contract: formData.get("contract"),
    }

    // 2. Validar los datos extraídos
    const validatedData = projectSchema.parse(rawData)

    // 3. Crear el proyecto en la BD (sin la URL del contrato todavía)
    const result = await db
      .insert(projects)
      .values({
        name: validatedData.name,
        status: validatedData.status,
        clientId: validatedData.clientId,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        businessId: parseInt(businessId),
      })

    const projectId = result[0].insertId

    // 4. Subir el archivo si existe
    let contractUrl: string | undefined = undefined
    if (validatedData.contract && validatedData.contract.size > 0) {
      contractUrl = await uploadContract(validatedData.contract, projectId.toString())
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
export async function updateProject(projectId: number, formData: FormData): Promise<ProjectActionResult> {
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
      const contractUrl = await uploadContract(contract, projectId.toString())
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
export async function deleteProject(projectId: number): Promise<ProjectActionResult> {
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
export async function changeProjectStatus(id: number, status: "won" | "lost" | "pending"): Promise<ProjectActionResult> {
  const db = await getDb()
  const businessId = await getActiveBusiness()
  if (!businessId) {
    return { error: "No hay negocio activo" }
  }

  try {
    await db
      .update(projects)
      .set({ status })
      .where(and(eq(projects.id, id), eq(projects.businessId, parseInt(businessId))))
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
  const businessId = await getActiveBusiness()
  if (!businessId) {
    return []
  }

  try {
    const conditions = [
      eq(projects.businessId, parseInt(businessId)),
      eq(projects.isDeleted, false),
    ]

    if (status && status !== "all") {
      conditions.push(eq(projects.status, status as "won" | "lost" | "pending"))
    }
    if (clientId) {
      conditions.push(eq(projects.clientId, parseInt(clientId)))
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
        clientName: clients.name,
        startDate: projects.startDate,
        endDate: projects.endDate,
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
export async function getProjectById(projectId: number) {
  const db = await getDb()
  const businessId = await getActiveBusiness()
  if (!businessId) {
    return null
  }

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.businessId, parseInt(businessId))))
    return project || null
  } catch (error) {
    console.error("Error obteniendo proyecto por ID:", error)
    return null
  }
}

// Obtener las facturas asociadas a un proyecto
export async function getProjectInvoices(projectId: number) {
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
