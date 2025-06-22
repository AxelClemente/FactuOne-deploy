import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { UserRegistrationForm } from "@/components/users/user-registration-form"
import { db } from "@/lib/db"

export default async function NewUserPage() {
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

  if (!businessUser) {
    // Si no es administrador, redirigir al dashboard
    redirect("/dashboard")
  }

  return (
    <div className="w-full py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Registrar nuevo usuario</h1>
        <p className="text-muted-foreground">Añade un nuevo usuario al negocio {activeBusiness.name}</p>
      </div>

      <div className="rounded-md border p-6 shadow-sm">
        <UserRegistrationForm businessId={activeBusiness.id} />
      </div>
    </div>
  )
}
