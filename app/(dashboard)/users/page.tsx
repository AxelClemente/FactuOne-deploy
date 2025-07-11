import Link from "next/link"
import { redirect } from "next/navigation"
import { PlusCircle } from "lucide-react"
import { and, eq } from "drizzle-orm"

import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getUsersForBusiness } from "./actions"
import { UserList } from "@/components/users/user-list"

export default async function UsersPage() {
  // Verificar que el usuario está autenticado
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    redirect("/login")
  }
  console.log("[USERS PAGE] currentUser:", currentUser)

  // Obtener el negocio activo
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }
  console.log("[USERS PAGE] activeBusiness:", activeBusiness)

  // Obtener todos los usuarios del negocio (incluye roles)
  const users = await getUsersForBusiness(activeBusiness.id)
  console.log("[USERS PAGE] users for business:", users)

  // Determinar si el usuario actual es admin en este negocio
  const currentUserBusiness = users.find(
    (u) => u.id === currentUser.id && u.role === "admin"
  )
  const isAdmin = !!currentUserBusiness
  if (!isAdmin) {
    // Si no es admin, redirigir al dashboard
    redirect("/dashboard")
  }
  console.log("[USERS PAGE] isAdmin:", isAdmin)

  // Verificación temporal: verificar permisos del usuario admin
  if (isAdmin) {
    const { hasPermission } = await import("@/lib/auth")
    const { getDb, userPermissions } = await import("@/lib/db")
    const uuid = await import("uuid")
    
    // Verificar si existen permisos para el admin
    const db = await getDb()
    const existingPermissions = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, currentUser.id),
          eq(userPermissions.businessId, activeBusiness.id)
        )
      )
    
    console.log("[USERS PAGE] Existing permissions for admin:", existingPermissions)
    
    // Si no hay permisos, crearlos automáticamente para el admin
    if (existingPermissions.length === 0) {
      console.log("[USERS PAGE] No permissions found for admin, creating default permissions...")
      
      const modules = ["clients", "invoices", "received_invoices", "projects", "providers"]
      
      for (const module of modules) {
        await db.insert(userPermissions).values({
          id: uuid.v4(),
          userId: currentUser.id,
          businessId: activeBusiness.id,
          module,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        })
      }
      
      console.log("[USERS PAGE] Default permissions created for admin")
    }
    
    const canCreateClients = await hasPermission(currentUser.id, activeBusiness.id, "clients", "create")
    const canCreateInvoices = await hasPermission(currentUser.id, activeBusiness.id, "invoices", "create")
    const canCreateProjects = await hasPermission(currentUser.id, activeBusiness.id, "projects", "create")
    const canCreateProviders = await hasPermission(currentUser.id, activeBusiness.id, "providers", "create")
    const canCreateReceivedInvoices = await hasPermission(currentUser.id, activeBusiness.id, "received_invoices", "create")
    
    console.log("[USERS PAGE] Admin permissions:", {
      canCreateClients,
      canCreateInvoices,
      canCreateProjects,
      canCreateProviders,
      canCreateReceivedInvoices
    })
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los usuarios que tienen acceso a este negocio</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/users/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Link>
          </Button>
        )}
      </div>
      <UserList users={users.filter(Boolean)} businessId={activeBusiness.id} currentUserId={currentUser.id} isAdmin={isAdmin} ownerId={activeBusiness.ownerId} />
    </div>
  )
}
