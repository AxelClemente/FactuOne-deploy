import { cookies } from "next/headers"
import { getDb } from "@/lib/db"

export async function getActiveBusiness() {
  try {
    console.log("[getActiveBusiness] process.env.NODE_ENV:", process.env.NODE_ENV)
    console.log("[getActiveBusiness] typeof window:", typeof window)
    // En desarrollo, devolver el ID del negocio existente
    if (process.env.NODE_ENV === "development") {
      console.log("[getActiveBusiness] Modo desarrollo - devolviendo negocio existente")
      return "b4fbd72c-8786-4015-b5a3-3a77052ebf4c" // ID del negocio existente
    }

    // En producción, verificar si estamos en el navegador antes de usar localStorage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const activeBusinessId = localStorage.getItem("activeBusiness")
      console.log("[getActiveBusiness] localStorage.getItem('activeBusiness'):", activeBusinessId)
      if (activeBusinessId) {
        console.log("[getActiveBusiness] Negocio activo desde localStorage:", activeBusinessId)
        return activeBusinessId
      }
    } else {
      console.log("[getActiveBusiness] No estamos en el navegador o localStorage no está disponible")
    }

    // Si no hay negocio activo o estamos en el servidor, devolver el existente
    console.log("[getActiveBusiness] No hay negocio activo, devolviendo existente")
    return "b4fbd72c-8786-4015-b5a3-3a77052ebf4c" // ID del negocio existente
  } catch (error) {
    console.error("[getActiveBusiness] Error:", error)
    return "b4fbd72c-8786-4015-b5a3-3a77052ebf4c" // ID del negocio existente
  }
}
