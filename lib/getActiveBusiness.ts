export async function getActiveBusiness() {
  try {
    // En desarrollo, devolver un ID por defecto
    if (process.env.NODE_ENV === "development") {
      console.log("[getActiveBusiness] Modo desarrollo - devolviendo negocio por defecto")
      return "1"
    }

    // En producción, verificar si estamos en el navegador antes de usar localStorage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const activeBusinessId = localStorage.getItem("activeBusiness")
      if (activeBusinessId) {
        console.log("[getActiveBusiness] Negocio activo desde localStorage:", activeBusinessId)
        return activeBusinessId
      }
    }

    // Si no hay negocio activo o estamos en el servidor, devolver el primero disponible
    console.log("[getActiveBusiness] No hay negocio activo, devolviendo por defecto")
    return "clb1234567890"
  } catch (error) {
    console.error("[getActiveBusiness] Error:", error)
    return "clb1234567890"
  }
}
