import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { UserForm } from "@/components/users/user-form"
import { db } from "@/lib/db"

export default async function EditUserPage({ params }: { params: { id: string } }) {
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
  const currentUserBusiness = await db.businessUser.findFirst({
    where: {
      userId: currentUser.id,
      businessId: activeBusiness.id,
      role: "admin",
    },
  })

  const isAdmin = !!currentUserBusiness

  // Si no es administrador y no es su propio perfil, redirigir
  if (!isAdmin && params.id !== currentUser.id) {
    redirect("/dashboard")
  }

  // Obtener el usuario a editar
  const user = await db.user.findUnique({
    where: { id: params.id },
  })

  if (!user) {
    redirect("/users")
  }

  // Obtener el rol del usuario en el negocio
  const businessUser = await db.businessUser.findFirst({
    where: {
      userId: params.id,
      businessId: activeBusiness.id,
    },
  })

  if (!businessUser) {
    redirect("/users")
  }

  return (
    <div className="w-full py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Editar usuario</h1>
        <p className="text-muted-foreground">Modifica la información del usuario {user.name || user.email}</p>
      </div>

      <div className="rounded-md border p-6 shadow-sm">
        <UserForm
          user={{
            id: user.id,
            name: user.name || "",
            email: user.email,
            role: businessUser.role,
          }}
          businessId={activeBusiness.id}
          currentUserIsAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
