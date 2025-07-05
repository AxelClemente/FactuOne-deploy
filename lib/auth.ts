import { compare, hash } from "bcryptjs"
import { cookies } from "next/headers"
import { getDb, schema, userPermissions } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { capitalize } from "@/lib/utils"

/**
 * Verifica si la contraseña proporcionada coincide con el hash almacenado
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  console.log("Verificando contraseña...")

  // Para entornos de desarrollo, permitir contraseña "password123" para facilitar pruebas
  if (process.env.NODE_ENV !== "production" && password === "password123") {
    console.log("Modo desarrollo: Verificación de contraseña bypass activado")
    return true
  }

  try {
    // En modo desarrollo, si el hash es el simulado, verificar directamente
    if (process.env.NODE_ENV !== "production" && 
        hashedPassword === "$2b$10$XpC6qPjnYjYFN9Swk3WNxOiPRRKr1Vj9Sd4gK5xHGHQBGzKNmGe2W") {
      console.log("Modo desarrollo: Verificando contra hash simulado")
      return true
    }

    // Si el hashedPassword es una contraseña en texto plano (en la nueva implementación)
    if (hashedPassword === password) {
      console.log("Contraseña en texto plano coincide")
      return true
    }

    // Si es un hash real (en la implementación anterior)
    const result = await compare(password, hashedPassword)
    console.log("Resultado de verificación:", result)
    return result
  } catch (error) {
    console.error("Error al verificar contraseña:", error)
    // En caso de error en la verificación, devolver false por seguridad
    return false
  }
}

/**
 * Genera un hash seguro para una contraseña
 * En entorno de desarrollo, simula el hash para facilitar pruebas
 */
export async function hashPassword(password: string): Promise<string> {
  // En desarrollo, podemos simular un hash para facilitar pruebas
  if (process.env.NODE_ENV !== "production") {
    console.log("Modo desarrollo: Generando hash simulado")
    // Simulamos un hash pero mantenemos la estructura de un hash bcrypt
    return "$2b$10$XpC6qPjnYjYFN9Swk3WNxOiPRRKr1Vj9Sd4gK5xHGHQBGzKNmGe2W"
  }

  // En producción, usaríamos bcrypt real
  return hash(password, 10)
}

/**
 * Verifica si el usuario está autenticado basado en la cookie de sesión
 */
export async function isAuthenticated(): Promise<boolean> {
  // En entorno de desarrollo, siempre devolver true para facilitar pruebas
  if (process.env.NODE_ENV !== "production") {
    console.log("Modo desarrollo: Usuario considerado autenticado para pruebas")
    return true
  }

  // En producción, verificaríamos la sesión en la base de datos
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value
  return !!sessionToken
}

/**
 * Obtiene el usuario actual basado en la cookie de sesión
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;
  if (!userId) return null;

  const db = await getDb();
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return user[0] || null;
}

/**
 * Comprueba si el usuario tiene permiso granular para una acción en un módulo y negocio
 */
export async function hasPermission(userId: string, businessId: string, module: string, action: "view" | "create" | "edit" | "delete") {
  const db = await getDb();
  const perm = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.businessId, businessId),
        eq(userPermissions.module, module)
      )
    )
    .then(rows => rows[0]);
  if (!perm) return false;
  // Type guard para acceso seguro
  const key = `can${capitalize(action)}` as keyof typeof perm;
  return perm[key] === true;
}
