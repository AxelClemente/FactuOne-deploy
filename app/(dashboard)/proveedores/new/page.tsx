import { redirect } from "next/navigation"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import NewProviderForm from "@/components/providers/new-provider-form"

export const dynamic = 'force-dynamic'

export default async function NewProviderPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness || !activeBusiness.id) {
    redirect("/businesses")
  }

  // Comprobar permiso granular para crear proveedores
  const canCreate = await hasPermission(user.id, activeBusiness.id.toString(), "providers", "create");
  if (!canCreate) {
    redirect("/proveedores");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Proveedor</h1>
        <p className="text-muted-foreground">Registra un nuevo proveedor para tu negocio</p>
      </div>
      <div className="mx-auto max-w-2xl">
        <NewProviderForm businessId={activeBusiness.id.toString()} />
      </div>
    </div>
  )
} 