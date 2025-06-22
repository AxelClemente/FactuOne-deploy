"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcrypt"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { users, businessUsers } from "@/app/db/schema"
import { eq, and } from "drizzle-orm"

// Esquema de validación para registro de usuarios
const registerUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  businessId: z.string(),
  role: z.enum(["admin", "accountant"]),
})

type RegisterUserInput = z.infer<typeof registerUserSchema>

type RegisterUserResult = {
  success: boolean
  error?: string
  userId?: string
  userExists?: boolean
}

// Acción para registrar un nuevo usuario
export async function registerUser(input: RegisterUserInput): Promise<RegisterUserResult> {
  try {
    // Validar los datos de entrada
    const validatedData = registerUserSchema.parse(input)

    // Verificar que el usuario actual es administrador del negocio
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: "No has iniciado sesión",
      }
    }

    // Verificar que el usuario actual es administrador del negocio
    const currentUserBusiness = await getDb().query.businessUsers.findFirst({
      where: (businessUsers, { eq }) => eq(businessUsers.userId, currentUser.id) && eq(businessUsers.businessId, validatedData.businessId) && eq(businessUsers.role, "admin"),
    })

    if (!currentUserBusiness) {
      return {
        success: false,
        error: "No tienes permisos para registrar usuarios en este negocio",
      }
    }

    // Verificar si el usuario ya existe
    const existingUser = await getDb().query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email),
    })

    let userId: string

    if (existingUser) {
      // El usuario ya existe, usar su ID
      userId = existingUser.id.toString()

      // Verificar si ya está asociado al negocio
      const existingBusinessUser = await getDb().query.businessUsers.findFirst({
        where: (businessUsers, { eq }) => eq(businessUsers.userId, existingUser.id) && eq(businessUsers.businessId, validatedData.businessId),
      })

      if (existingBusinessUser) {
        return {
          success: false,
          error: "Este usuario ya está asociado a este negocio",
        }
      }
    } else {
      // Crear un nuevo usuario
      const passwordHash = await bcrypt.hash(validatedData.password, 10)

      const newUser = await getDb().insert(users).values({
        email: validatedData.email,
        passwordHash,
        name: validatedData.name || null,
      }).returning({ id: users.id })

      userId = newUser.id.toString()
    }

    // Asociar el usuario al negocio con el rol especificado
    await getDb().insert(businessUsers).values({
      userId,
      businessId: validatedData.businessId,
      role: validatedData.role,
    }).returning({ id: businessUsers.id })

    // Revalidar las rutas para actualizar la UI
    revalidatePath("/users")
    revalidatePath(`/businesses/${validatedData.businessId}/users`)

    return {
      success: true,
      userId,
      userExists: !!existingUser,
    }
  } catch (error) {
    console.error("Error al registrar usuario:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos de formulario inválidos",
      }
    }

    return {
      success: false,
      error: "Error al registrar el usuario",
    }
  }
}

// Obtener todos los usuarios de un negocio
export async function getUsersForBusiness(businessId: string | null) {
  if (!businessId) {
    return []
  }
  const db = await getDb()
  const businessIdNumber = parseInt(businessId, 10)

  const usersInBusiness = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: businessUsers.role,
    })
    .from(users)
    .leftJoin(businessUsers, eq(users.id, businessUsers.userId))
    .where(eq(businessUsers.businessId, businessIdNumber))

  return usersInBusiness
}

// Obtener un usuario por ID
export async function getUserById(userId: string) {
  const db = await getDb()
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, parseInt(userId, 10)),
  })
  return user
}

// Actualizar un usuario
export async function updateUser(userId: string, data: { name?: string; email?: string; role?: "admin" | "user" }) {
  const db = await getDb()
  const { name, email, role } = data
  const userIdNumber = parseInt(userId, 10)

  if (name || email) {
    await db
      .update(users)
      .set({ name, email })
      .where(eq(users.id, userIdNumber))
  }

  // Si se proporciona un rol, actualizamos la tabla de `businessUsers`
  // Esto asume que tienes un `businessId` activo para contextualizar el rol
  // Para este ejemplo, vamos a omitir la actualización de rol si no se proporciona un businessId
  // En una app real, lo obtendrías del estado de la aplicación o de un parámetro
  // if (role) {
  //   await db.update(businessUsers)
  //     .set({ role })
  //     .where(and(eq(businessUsers.userId, userIdNumber), eq(businessUsers.businessId, CURRENT_BUSINESS_ID)))
  // }

  revalidatePath("/users")
  revalidatePath(`/users/${userId}/edit`)
}

// Eliminar un usuario de un negocio
export async function deleteUserFromBusiness(userId: string, businessId: string) {
  try {
    const db = await getDb()
    const userIdNumber = parseInt(userId, 10)
    const businessIdNumber = parseInt(businessId, 10)

    await db
      .delete(businessUsers)
      .where(and(eq(businessUsers.userId, userIdNumber), eq(businessUsers.businessId, businessIdNumber)))

    revalidatePath("/users")
    
    return {
      success: true
    }
  } catch (error) {
    console.error("Error al eliminar usuario del negocio:", error)
    return {
      success: false,
      error: "Error al eliminar el usuario del negocio"
    }
  }
}
