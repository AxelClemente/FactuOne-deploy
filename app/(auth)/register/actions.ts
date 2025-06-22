"use server"
import { z } from "zod"

import { getDb, schema } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
})

type RegisterResult = {
  success: boolean
  error?: string
}

export async function registerUser(formData: z.infer<typeof registerSchema>): Promise<RegisterResult> {
  console.log("Server Action: registerUser iniciado", formData.email)

  try {
    // Validar los datos del formulario
    const validatedData = registerSchema.parse(formData)
    console.log("Datos validados correctamente")

    // Verificar si el email ya existe en la base de datos
    const db = await getDb();
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email),
    })

    if (existingUser) {
      console.log("Email ya registrado:", validatedData.email)
      return {
        success: false,
        error: "Este email ya está registrado",
      }
    }

    // Hashear la contraseña
    const passwordHash = await hashPassword(validatedData.password)
    console.log("Contraseña hasheada correctamente")

    // Crear el nuevo usuario en la base de datos
    await db.insert(schema.users).values({
      email: validatedData.email,
      passwordHash,
      name: validatedData.name || null,
    });

    console.log("Usuario creado correctamente")

    return { success: true }
  } catch (error) {
    console.error("Error detallado en el registro:", error)
    return {
      success: false,
      error: "Error al procesar la solicitud de registro",
    }
  }
}
