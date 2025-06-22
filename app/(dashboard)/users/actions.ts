"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcrypt"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

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
    const currentUserBusiness = await db.businessUser.findFirst({
      where: {
        userId: currentUser.id,
        businessId: validatedData.businessId,
        role: "admin",
      },
    })

    if (!currentUserBusiness) {
      return {
        success: false,
        error: "No tienes permisos para registrar usuarios en este negocio",
      }
    }

    // Verificar si el usuario ya existe
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    })

    let userId: string

    if (existingUser) {
      // El usuario ya existe, usar su ID
      userId = existingUser.id

      // Verificar si ya está asociado al negocio
      const existingBusinessUser = await db.businessUser.findFirst({
        where: {
          userId: existingUser.id,
          businessId: validatedData.businessId,
        },
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

      const newUser = await db.user.create({
        data: {
          email: validatedData.email,
          passwordHash,
          name: validatedData.name || null,
        },
      })

      userId = newUser.id
    }

    // Asociar el usuario al negocio con el rol especificado
    await db.businessUser.create({
      data: {
        userId,
        businessId: validatedData.businessId,
        role: validatedData.role,
      },
    })

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

// Acción para actualizar un usuario existente
export async function updateUser(
  userId: string,
  businessId: string,
  formData: { name: string; role: "admin" | "accountant" },
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que el usuario actual es administrador del negocio
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: "No has iniciado sesión",
      }
    }

    // Verificar que el usuario actual es administrador del negocio
    const currentUserBusiness = await db.businessUser.findFirst({
      where: {
        userId: currentUser.id,
        businessId,
        role: "admin",
      },
    })

    if (!currentUserBusiness) {
      return {
        success: false,
        error: "No tienes permisos para editar usuarios en este negocio",
      }
    }

    // Verificar que el usuario a editar existe y pertenece al negocio
    const userBusiness = await db.businessUser.findFirst({
      where: {
        userId,
        businessId,
      },
    })

    if (!userBusiness) {
      return {
        success: false,
        error: "El usuario no pertenece a este negocio",
      }
    }

    // Actualizar el nombre del usuario
    await db.user.update({
      where: { id: userId },
      data: {
        name: formData.name,
      },
    })

    // Actualizar el rol del usuario en el negocio
    await db.businessUser.update({
      where: {
        id: userBusiness.id,
      },
      data: {
        role: formData.role,
      },
    })

    // Revalidar las rutas para actualizar la UI
    revalidatePath(`/users/${userId}`)
    revalidatePath("/users")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return {
      success: false,
      error: "Error al actualizar el usuario",
    }
  }
}

// Acción para eliminar un usuario del negocio
export async function removeUserFromBusiness(
  userId: string,
  businessId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que el usuario actual es administrador del negocio
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: "No has iniciado sesión",
      }
    }

    // No permitir eliminar al propio usuario
    if (userId === currentUser.id) {
      return {
        success: false,
        error: "No puedes eliminarte a ti mismo del negocio",
      }
    }

    // Verificar que el usuario actual es administrador del negocio
    const currentUserBusiness = await db.businessUser.findFirst({
      where: {
        userId: currentUser.id,
        businessId,
        role: "admin",
      },
    })

    if (!currentUserBusiness) {
      return {
        success: false,
        error: "No tienes permisos para eliminar usuarios de este negocio",
      }
    }

    // Verificar que el usuario a eliminar existe y pertenece al negocio
    const userBusiness = await db.businessUser.findFirst({
      where: {
        userId,
        businessId,
      },
    })

    if (!userBusiness) {
      return {
        success: false,
        error: "El usuario no pertenece a este negocio",
      }
    }

    // Eliminar la relación entre el usuario y el negocio
    await db.businessUser.delete({
      where: {
        id: userBusiness.id,
      },
    })

    // Revalidar las rutas para actualizar la UI
    revalidatePath("/users")
    revalidatePath(`/businesses/${businessId}/users`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error al eliminar usuario del negocio:", error)
    return {
      success: false,
      error: "Error al eliminar el usuario del negocio",
    }
  }
}
