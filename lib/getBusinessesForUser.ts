import { getDb } from "@/lib/db"
import { businesses, businessUsers, users } from "@/app/db/schema"
import { eq } from "drizzle-orm"

export async function getBusinessesForUser(userId: string | undefined) {
  if (!userId) {
    console.warn("[getBusinessesForUser] No se proporcionó userId. Devolviendo array vacío.")
    return []
  }

  try {
    const db = await getDb()
    console.log(`[getBusinessesForUser] Obteniendo negocios para el usuario: ${userId}`)

    const userBusinesses = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        nif: businesses.nif,
        fiscalAddress: businesses.fiscalAddress,
        role: businessUsers.role,
      })
      .from(businessUsers)
      .leftJoin(businesses, eq(businessUsers.businessId, businesses.id))
      .where(eq(businessUsers.userId, userId))

    console.log(`[getBusinessesForUser] Se encontraron ${userBusinesses.length} negocios.`)
    // El tipo de id es number, lo convertimos a string para que coincida con el componente
    return userBusinesses.map((b) => ({ ...b, id: b.id.toString() }))
  } catch (error) {
    console.error("[getBusinessesForUser] Error al obtener los negocios:", error)
    return []
  }
}
