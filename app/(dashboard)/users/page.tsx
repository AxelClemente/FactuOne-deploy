import Link from "next/link"
import { redirect } from "next/navigation"
import { PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
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
  const activeBusinessId = await getActiveBusiness()
  if (!activeBusinessId) {
    redirect("/businesses")
  }
  console.log("[USERS PAGE] activeBusinessId:", activeBusinessId)

  // Obtener todos los usuarios del negocio (incluye roles)
  const users = await getUsersForBusiness(activeBusinessId)
  console.log("[USERS PAGE] users for business:", users)

  // Determinar si el usuario actual es admin en este negocio
  // const currentUserBusiness = users.find(
  //   (u) => u.id === currentUser.id && u.role === "admin"
  // )
  // const isAdmin = !!currentUserBusiness
  const isAdmin = true; // <-- Forzar admin para depuración

  return (
    <div className="w-full border py-4">
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

      <UserList users={users.filter(Boolean)} businessId={activeBusinessId} currentUserId={currentUser.id} isAdmin={isAdmin} />
    </div>
  )
}
