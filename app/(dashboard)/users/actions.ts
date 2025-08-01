"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { getDb, schema } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, and, inArray } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

// Esquema de validación para registro de usuarios
const registerUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  businessId: z.string(),
  role: z.enum(["admin", "accountant"]),
  permissions: z.record(
    z.object({
      canView: z.boolean(),
      canCreate: z.boolean(),
      canEdit: z.boolean(),
      canDelete: z.boolean(),
    })
  ),
  exclusions: z.record(z.array(z.string())).optional(),
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

    const db = await getDb();

    // Verificar que el usuario actual es administrador del negocio
    const currentUserBusiness = await db
      .select()
      .from(schema.businessUsers)
      .where(
        and(
          eq(schema.businessUsers.userId, currentUser.id),
          eq(schema.businessUsers.businessId, validatedData.businessId),
          eq(schema.businessUsers.role, "admin")
        )
      )
      .then((rows) => rows[0]);

    if (!currentUserBusiness) {
      return {
        success: false,
        error: "No tienes permisos para registrar usuarios en este negocio",
      }
    }

    // Verificar si el usuario ya existe
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, validatedData.email))
      .then((rows) => rows[0]);

    let userId: string

    if (existingUser) {
      // El usuario ya existe, usar su ID
      userId = existingUser.id.toString()

      // Verificar si ya está asociado al negocio
      const existingBusinessUser = await db
        .select()
        .from(schema.businessUsers)
        .where(
          and(
            eq(schema.businessUsers.userId, existingUser.id),
            eq(schema.businessUsers.businessId, validatedData.businessId)
          )
        )
        .then((rows) => rows[0]);

      if (existingBusinessUser) {
        return {
          success: false,
          error: "Este usuario ya está asociado a este negocio",
        }
      }
    } else {
      // Crear un nuevo usuario
      const passwordHash = await bcrypt.hash(validatedData.password, 10)
      const newUserId = uuidv4();
      await db.insert(schema.users).values({
        id: newUserId,
        email: validatedData.email,
        passwordHash,
        name: validatedData.name || null,
      });
      userId = newUserId;
    }

    // Asociar el usuario al negocio con el rol especificado
    const newBusinessUserId = uuidv4();
    await db.insert(schema.businessUsers).values({
      id: newBusinessUserId,
      userId,
      businessId: validatedData.businessId,
      role: validatedData.role,
    });

    // Guardar permisos granulares
    const permissions = validatedData.permissions;
    const modules = Object.keys(permissions);
    for (const mod of modules) {
      const perm = permissions[mod];
      // Elimina permisos previos si existen (por si el usuario ya existía)
      await db.delete(schema.userPermissions).where(
        and(
          eq(schema.userPermissions.userId, userId),
          eq(schema.userPermissions.businessId, validatedData.businessId),
          eq(schema.userPermissions.module, mod)
        )
      );
      await db.insert(schema.userPermissions).values({
        id: uuidv4(),
        userId,
        businessId: validatedData.businessId,
        module: mod,
        canView: perm.canView,
        canCreate: perm.canCreate,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
      });
    }

    // En registerUser y updateUser, manejar exclusions
    if (input.exclusions) {
      for (const [module, ids] of Object.entries(input.exclusions)) {
        for (const entityId of ids) {
          await db.insert(schema.userModuleExclusions).values({
            id: uuidv4(),
            userId,
            businessId: validatedData.businessId,
            module,
            entityId,
          });
        }
      }
    }

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
  console.log("=== NUEVO getUsersForBusiness ===");
  console.log("businessId recibido:", businessId);
  // 1. Obtener las relaciones usuario-negocio para el negocio activo
  const businessUsersRows = await db
    .select()
    .from(schema.businessUsers)
    .where(eq(schema.businessUsers.businessId, businessId));
  console.log('businessUsersRows:', businessUsersRows);

  if (businessUsersRows.length === 0) return [];

  // 2. Obtener los usuarios por ID
  const userIds = businessUsersRows.map((bu: any) => bu.userId);
  console.log('userIds:', userIds);
  const usersRows = userIds.length
    ? await db.select().from(schema.users).where(inArray(schema.users.id, userIds))
    : [];
  console.log('usersRows:', usersRows);

  // 3. Unir los datos en memoria
  const usersInBusiness = businessUsersRows
    .map((bu: any) => {
      const user = usersRows.find((u: any) => u.id === bu.userId);
      if (!user) return undefined;
      return {
        id: user.id,
        name: user.name ?? "Sin nombre",
        email: user.email,
        role: bu.role,
      };
    })
    .filter((u): u is { id: string; name: string; email: string; role: any } => u !== undefined);
  console.log('[getUsersForBusiness] usersInBusiness:', usersInBusiness)
  return usersInBusiness;
}

// Obtener un usuario por ID
export async function getUserById(userId: string) {
  const db = await getDb()
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .then((rows) => rows[0]);
  return user
}

// Actualizar un usuario
export async function updateUser(userId: string, businessId: string, data: { name?: string; email?: string; role?: "admin" | "accountant"; permissions?: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>; exclusions?: Record<string, string[]> }) {
  try {
    const db = await getDb()
    const { name, email, role, permissions } = data

    // Actualizar datos del usuario si se proporcionan
    if (name || email) {
      await db
        .update(schema.users)
        .set({ name, email })
        .where(eq(schema.users.id, userId))
    }

    // Actualizar el rol en la tabla businessUsers si se proporciona
    if (role) {
      await db
        .update(schema.businessUsers)
        .set({ role })
        .where(and(eq(schema.businessUsers.userId, userId), eq(schema.businessUsers.businessId, businessId)))
    }

    // Guardar permisos granulares si se proporcionan
    if (permissions) {
      const modules = Object.keys(permissions);
      for (const mod of modules) {
        const perm = permissions[mod];
        // Elimina permisos previos si existen
        await db.delete(schema.userPermissions).where(
          and(
            eq(schema.userPermissions.userId, userId),
            eq(schema.userPermissions.businessId, businessId),
            eq(schema.userPermissions.module, mod)
          )
        );
        await db.insert(schema.userPermissions).values({
          id: uuidv4(),
          userId,
          businessId,
          module: mod,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
        });
      }
    }

    // Al actualizar usuario
    if (data.exclusions) {
      // Eliminar exclusiones previas
      await db.delete(schema.userModuleExclusions).where(
        and(
          eq(schema.userModuleExclusions.userId, userId),
          eq(schema.userModuleExclusions.businessId, businessId)
        )
      );
      // Insertar nuevas exclusiones
      for (const [module, ids] of Object.entries(data.exclusions)) {
        for (const entityId of ids) {
          await db.insert(schema.userModuleExclusions).values({
            id: uuidv4(),
            userId,
            businessId,
            module,
            entityId,
          });
        }
      }
    }

    revalidatePath("/users")
    revalidatePath(`/users/${userId}/edit`)

    return {
      success: true
    }
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return {
      success: false,
      error: "Error al actualizar el usuario"
    }
  }
}

// Eliminar un usuario de un negocio
export async function deleteUserFromBusiness(userId: string, businessId: string) {
  try {
    const db = await getDb()
    await db
      .delete(schema.businessUsers)
      .where(and(eq(schema.businessUsers.userId, userId), eq(schema.businessUsers.businessId, businessId)))

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

// Obtener permisos granulares de un usuario para un negocio
export async function getUserPermissions(userId: string, businessId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.userPermissions)
    .where(
      and(
        eq(schema.userPermissions.userId, userId),
        eq(schema.userPermissions.businessId, businessId)
      )
    );
  // Devuelve un objeto { [module]: { canView, canCreate, ... } }
  const perms: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = {};
  for (const row of rows) {
    perms[row.module] = {
      canView: row.canView,
      canCreate: row.canCreate,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
    };
  }
  return perms;
}

// Actualizar permisos de un usuario
export async function updateUserPermissions(
  userId: string,
  businessId: string,
  permissions: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>
) {
  try {
    // Verificar que el usuario actual es administrador del negocio
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: "No has iniciado sesión",
      }
    }

    const db = await getDb();

    // Verificar que el usuario actual es administrador del negocio
    const currentUserBusiness = await db
      .select()
      .from(schema.businessUsers)
      .where(
        and(
          eq(schema.businessUsers.userId, currentUser.id),
          eq(schema.businessUsers.businessId, businessId),
          eq(schema.businessUsers.role, "admin")
        )
      )
      .then((rows) => rows[0]);

    if (!currentUserBusiness) {
      return {
        success: false,
        error: "No tienes permisos de administrador para actualizar permisos en este negocio",
      }
    }

    // Verificar que el usuario objetivo existe y pertenece al negocio
    const targetUserBusiness = await db
      .select()
      .from(schema.businessUsers)
      .where(
        and(
          eq(schema.businessUsers.userId, userId),
          eq(schema.businessUsers.businessId, businessId)
        )
      )
      .then((rows) => rows[0]);

    if (!targetUserBusiness) {
      return {
        success: false,
        error: "El usuario no existe en este negocio",
      }
    }

    // Actualizar permisos
    const modules = Object.keys(permissions);
    for (const mod of modules) {
      const perm = permissions[mod];
      // Elimina permisos previos si existen
      await db.delete(schema.userPermissions).where(
        and(
          eq(schema.userPermissions.userId, userId),
          eq(schema.userPermissions.businessId, businessId),
          eq(schema.userPermissions.module, mod)
        )
      );
      await db.insert(schema.userPermissions).values({
        id: uuidv4(),
        userId,
        businessId,
        module: mod,
        canView: perm.canView,
        canCreate: perm.canCreate,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
      });
    }

    revalidatePath("/users")
    revalidatePath(`/users/${userId}/edit`)

    return {
      success: true
    }
  } catch (error) {
    console.error("Error al actualizar permisos del usuario:", error)
    return {
      success: false,
      error: "Error al actualizar los permisos del usuario"
    }
  }
}

// Desactivar un usuario de un negocio
export async function deactivateUser(userId: string, businessId: string) {
  try {
    // Verificar que el usuario actual es administrador del negocio
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: "No has iniciado sesión",
      }
    }

    const db = await getDb();

    // Verificar que el usuario actual es administrador del negocio
    const currentUserBusiness = await db
      .select()
      .from(schema.businessUsers)
      .where(
        and(
          eq(schema.businessUsers.userId, currentUser.id),
          eq(schema.businessUsers.businessId, businessId),
          eq(schema.businessUsers.role, "admin")
        )
      )
      .then((rows) => rows[0]);

    if (!currentUserBusiness) {
      return {
        success: false,
        error: "No tienes permisos de administrador para desactivar usuarios en este negocio",
      }
    }

    // Verificar que el usuario objetivo existe y pertenece al negocio
    const targetUserBusiness = await db
      .select()
      .from(schema.businessUsers)
      .where(
        and(
          eq(schema.businessUsers.userId, userId),
          eq(schema.businessUsers.businessId, businessId)
        )
      )
      .then((rows) => rows[0]);

    if (!targetUserBusiness) {
      return {
        success: false,
        error: "El usuario no existe en este negocio",
      }
    }

    // Prevenir que el usuario se desactive a sí mismo
    if (currentUser.id === userId) {
      return {
        success: false,
        error: "No puedes desactivarte a ti mismo",
      }
    }

    // Si el usuario a desactivar es admin, verificar que no es el último admin
    if (targetUserBusiness.role === "admin") {
      const adminCount = await db
        .select()
        .from(schema.businessUsers)
        .where(
          and(
            eq(schema.businessUsers.businessId, businessId),
            eq(schema.businessUsers.role, "admin"),
            eq(schema.businessUsers.isActive, true)
          )
        )
        .then((rows) => rows.length);

      if (adminCount <= 1) {
        return {
          success: false,
          error: "No puedes desactivar el último administrador del negocio",
        }
      }
    }

    // Desactivar usuario
    await db
      .update(schema.businessUsers)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.businessUsers.userId, userId),
          eq(schema.businessUsers.businessId, businessId)
        )
      );

    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)

    return {
      success: true
    }
  } catch (error) {
    console.error("Error al desactivar usuario:", error)
    return {
      success: false,
      error: "Error al desactivar el usuario"
    }
  }
}
