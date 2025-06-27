import { cookies } from "next/headers"

export async function getActiveBusiness() {
  // 1. Buscar en cookies (SSR y API routes)
  try {
    const cookieStore = await cookies();
    const activeBusinessId = cookieStore.get("active_business")?.value;
    if (activeBusinessId) {
      return activeBusinessId;
    }
  } catch (e) {
    // Ignorar errores de cookies en el cliente
  }

  // 2. Buscar en localStorage (solo si está en el navegador)
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const activeBusinessId = localStorage.getItem("active_business");
    if (activeBusinessId) {
      return activeBusinessId;
    }
  }

  // 3. Si no hay negocio activo, devolver null
  return null;
}
