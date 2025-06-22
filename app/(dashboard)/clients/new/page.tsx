import { redirect } from "next/navigation"
import { ClientForm } from "@/components/clients/client-form"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"

export default async function NewClientPage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener el negocio activo
  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
        <p className="text-muted-foreground">Registra un nuevo cliente para tu negocio</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <ClientForm businessId={activeBusiness.id.toString()} />
      </div>
    </div>
  )
}
