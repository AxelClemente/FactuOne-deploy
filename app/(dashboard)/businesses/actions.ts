"use server"

import { cookies } from "next/headers"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { getDb, getBusinessesForUser, schema } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

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
      id: uuidv4(),
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
      id: uuidv4(),
      userId: userId,
      businessId: newBusiness.id,
      role: "admin",
    });

    // Insertar permisos granulares para el admin/owner
    const MODULES = ["clients", "invoices", "received_invoices", "projects", "providers", "businesses"];
    await db.insert(schema.userPermissions).values(
      MODULES.map((module) => ({
        id: uuidv4(),
        userId: userId,
        businessId: newBusiness.id,
        module,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      }))
    );

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
    
    // Verificar permisos granulares para editar negocios
    const { hasPermission } = await import("@/lib/auth")
    const canEditBusiness = await hasPermission(userId, businessId, "businesses", "edit")
    
    if (!canEditBusiness) {
      return { success: false, error: "No tienes permisos para editar negocios" }
    }

    const db = await getDb();
    await db.update(schema.businesses)
      .set(validatedData)
      .where(eq(schema.businesses.id, businessId));

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

    console.log("[getActiveBusiness] Cookie active_business:", activeBusinessId)

    if (!activeBusinessId) {
      if (process.env.NODE_ENV === "development") {
        console.log("[getActiveBusiness] Modo desarrollo - buscando primer negocio")
        // En desarrollo, obtener el primer negocio disponible
        const db = await getDb();
        const firstBusiness = await db.query.businesses.findFirst();
        console.log("[getActiveBusiness] Primer negocio encontrado:", firstBusiness)
        return firstBusiness || null;
      }
      return null
    }

    const db = await getDb();
    const business = await db.query.businesses.findFirst({
      where: (businesses, { eq }) => eq(businesses.id, activeBusinessId),
    })

    console.log("[getActiveBusiness] Negocio encontrado por ID:", business)
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
