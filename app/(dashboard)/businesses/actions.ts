"use server"

import { cookies } from "next/headers"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { getDb, getBusinessesForUser, schema } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// Validación del esquema
const businessSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  nif: z.string().min(1, "El NIF es obligatorio"),
  fiscalAddress: z.string().min(1, "La dirección fiscal es obligatoria"),
})

export async function getBusinesses(userId: string) {
  try {
    return await getBusinessesForUser(userId)
  } catch {
    return []
  }
}

export async function createBusiness(data: z.infer<typeof businessSchema>, userId: string) {
  try {
    const validatedData = businessSchema.parse(data)
    const db = await getDb();

    const existingBusiness = await db.query.businesses.findFirst({
      where: (businesses, { eq }) => eq(businesses.nif, validatedData.nif),
    })

    if (existingBusiness) {
      return { success: false, error: "Ya existe un negocio con este NIF" }
    }

    // Crear el negocio
    await db.insert(schema.businesses).values({ 
      ...validatedData
    });

    // Obtener el ID del negocio recién creado
    const newBusiness = await db.query.businesses.findFirst({
      where: (businesses, { eq }) => eq(businesses.nif, validatedData.nif),
    });

    if (!newBusiness) {
      return { success: false, error: "Error al crear el negocio" }
    }

    // Crear la relación usuario-negocio
    await db.insert(schema.businessUsers).values({
      userId: parseInt(userId),
      businessId: newBusiness.id,
      role: "admin",
    });

    const cookieStore = await cookies();
    cookieStore.set("active_business", newBusiness.id.toString())
    return { success: true, businessId: newBusiness.id }
  } catch (error) {
    console.error("Error al crear negocio:", error)
    return { success: false, error: "Error al crear el negocio" }
  }
}

export async function updateBusiness(businessId: string, data: z.infer<typeof businessSchema>, userId: string) {
  try {
    const validatedData = businessSchema.parse(data)
    const businesses = await getBusinessesForUser(userId)
    const hasAccess = businesses.some((b) => b.id === parseInt(businessId))

    if (!hasAccess) {
      return { success: false, error: "No tienes permiso para editar este negocio" }
    }

    const db = await getDb();
    await db.update(schema.businesses)
      .set(validatedData)
      .where(eq(schema.businesses.id, parseInt(businessId)));

    return { success: true, businessId }
  } catch (error) {
    console.error("Error al actualizar negocio:", error)
    return { success: false, error: "Error al actualizar el negocio" }
  }
}

export async function setActiveBusiness(businessId: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set("active_business", businessId)
    return { success: true }
  } catch (error) {
    console.error("Error al establecer negocio activo:", error)
    return { success: false }
  }
}

export async function getActiveBusiness() {
  try {
    const cookieStore = await cookies();
    const activeBusinessId = cookieStore.get("active_business")?.value

    if (!activeBusinessId) {
      if (process.env.NODE_ENV === "development") return { id: "1" }
      return null
    }

    const db = await getDb();
    const business = await db.query.businesses.findFirst({
      where: (businesses, { eq }) => eq(businesses.id, activeBusinessId),
    })

    return business || null
  } catch (error) {
    console.error("Error al obtener negocio activo:", error)
    return null
  }
}

// ✅ Ya no hace redirect aquí, solo devuelve la ruta
export async function getRedirectPathBasedOnBusinesses(userId: string) {
  try {
    const businesses = await getBusinessesForUser(userId)

    if (businesses.length === 0) {
      return "/businesses"
    }

    if (businesses.length === 1) {
      return "/dashboard"
    }

    return "/select-business"
  } catch (error) {
    console.error("Error al determinar ruta de redirección:", error)
    return "/businesses"
  }
}


export async function requireActiveBusiness() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Usuario no autenticado")

  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) throw new Error("No hay negocio activo")

  return { user, activeBusiness }
}
