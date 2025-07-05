import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ClientList } from "@/components/clients/client-list"
import { ClientListSkeleton } from "@/components/clients/client-list-skeleton"
import { Button } from "@/components/ui/button"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { PlusCircle } from "lucide-react"

export default async function ClientsPage() {
  console.log("[SERVER] Cargando página de clientes")

  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    console.log("Usuario no autenticado, redirigiendo a /login")
    redirect("/login")
  }

  // Obtener el negocio activo
  const activeBusiness = await getActiveBusiness()
  console.log("Negocio activo obtenido:", activeBusiness)

  if (!activeBusiness) {
    console.log("Redirecting to /businesses", true)
    redirect("/businesses")
  }

  console.log("[DEBUG] user.id:", user.id)
  console.log("[DEBUG] activeBusiness.id:", activeBusiness.id)
  // Comprobar permiso granular para crear clientes
  const canCreateClient = await hasPermission(user.id, activeBusiness.id.toString(), "clients", "create")
  console.log("[DEBUG] canCreateClient:", canCreateClient)

  return (
    <div className="w-full px-4 py-4 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona los clientes de tu negocio para la facturación electrónica</p>
        </div>
        {/* El botón de Nuevo Cliente se gestiona en ClientList según el permiso */}
      </div>

      <Suspense fallback={<ClientListSkeleton />}>
        <ClientList businessId={activeBusiness.id.toString()} canCreateClient={canCreateClient} />
      </Suspense>
    </div>
  )
}
