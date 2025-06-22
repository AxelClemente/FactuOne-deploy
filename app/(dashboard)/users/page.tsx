import Link from "next/link"
import { redirect } from "next/navigation"
import { PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { db } from "@/lib/db"
import { UserList } from "@/components/users/user-list"

export default async function UsersPage() {
  // Verificar que el usuario está autenticado
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    redirect("/login")
  }

  // Obtener el negocio activo
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }

  // Verificar que el usuario actual es administrador del negocio
  const businessUser = await db.businessUser.findFirst({
    where: {
      userId: currentUser.id,
      businessId: activeBusiness.id,
      role: "admin",
    },
  })

  const isAdmin = !!businessUser

  // Obtener todos los usuarios del negocio
  const businessUsers = await db.businessUser.findMany({
    where: {
      businessId: activeBusiness.id,
    },
  })

  // Obtener los detalles de cada usuario
  const users = []
  for (const bu of businessUsers) {
    const user = await db.user.findUnique({
      where: { id: bu.userId },
    })
    if (user) {
      users.push({
        id: user.id,
        name: user.name || "Sin nombre",
        email: user.email,
        role: bu.role,
      })
    }
  }

  return (
    <div className="w-full border py-4">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los usuarios que tienen acceso a {activeBusiness.name}</p>
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

      <UserList users={users} businessId={activeBusiness.id} currentUserId={currentUser.id} isAdmin={isAdmin} />
    </div>
  )
}
