export async function getActiveBusiness() {
  try {
    // En desarrollo, devolver un ID por defecto
    if (process.env.NODE_ENV === "development") {
      console.log("[getActiveBusiness] Modo desarrollo - devolviendo negocio por defecto")
      return "1"
    }

    // En producción, obtener del localStorage o API
    const activeBusinessId = localStorage.getItem("activeBusiness")

    if (activeBusinessId) {
      console.log("[getActiveBusiness] Negocio activo desde localStorage:", activeBusinessId)
      return activeBusinessId
    }

    // Si no hay negocio activo, devolver el primero disponible
    console.log("[getActiveBusiness] No hay negocio activo, devolviendo por defecto")
    return "clb1234567890"
  } catch (error) {
    console.error("[getActiveBusiness] Error:", error)
    return "clb1234567890"
  }
}
