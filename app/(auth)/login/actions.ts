"use server"

import { cookies } from "next/headers"
import { z } from "zod"

import { getRedirectPathBasedOnBusinesses } from "@/app/(dashboard)/businesses/actions"
import { getDb } from "@/lib/db"
import { verifyPassword } from "@/lib/auth"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginResult = {
  success: boolean
  error?: string
  redirectTo?: string // Añadimos esta propiedad para indicar a dónde redirigir
}

export async function loginUser(formData: z.infer<typeof loginSchema>): Promise<LoginResult> {
  console.log("Server Action: loginUser iniciado", formData.email)

  try {
    // Validar los datos del formulario
    const validatedData = loginSchema.parse(formData)
    console.log("Datos validados correctamente")

    // Buscar el usuario en la base de datos
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email),
    })

    console.log("Búsqueda de usuario:", user ? "Encontrado" : "No encontrado")

    // Si no existe el usuario o la contraseña es incorrecta
    if (!user) {
      console.log("Usuario no encontrado")
      return {
        success: false,
        error: "Email o contraseña incorrectos",
      }
    }

    // Verificar la contraseña
    const isPasswordValid = user.passwordHash
      ? await verifyPassword(validatedData.password, user.passwordHash)
      : validatedData.password === user.password
    console.log("Verificación de contraseña:", isPasswordValid ? "Válida" : "Inválida")

    if (!isPasswordValid) {
      console.log("Contraseña incorrecta")
      return {
        success: false,
        error: "Email o contraseña incorrectos",
      }
    }

    // Añadir mensaje de autenticación exitosa
    console.log(
      `🔐 Usuario autenticado correctamente: ${user.email} (${user.name || "Sin nombre"}) - ${new Date().toISOString()}`,
    )

    // Crear una sesión para el usuario
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    console.log("Sesión creada con token:", sessionToken.substring(0, 8) + "...")

    // Guardar la sesión en una cookie segura
    const cookieStore = await cookies();
    cookieStore.set({
      name: "session_token",
      value: sessionToken,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
    })
    console.log("Cookie establecida correctamente")

    // Determinar a dónde redirigir al usuario basado en sus negocios
    const redirectPath = await getRedirectPathBasedOnBusinesses(user.id.toString())
    console.log("Ruta de redirección determinada:", redirectPath)

    return {
      success: true,
      redirectTo: redirectPath,
    }
  } catch (error) {
    console.error("Error detallado en el inicio de sesión:", error)
    return {
      success: false,
      error: "Error al procesar la solicitud",
    }
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token")
  cookieStore.delete("active_business")
  return { success: true }
}
