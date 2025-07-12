import { redirect } from "next/navigation"
import { BusinessForm } from "@/components/businesses/business-form"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getBusinessesForUser } from "@/lib/db"

export const dynamic = 'force-dynamic'

export default async function NewBusinessPage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Verificar permisos para crear negocios
  const businesses = await getBusinessesForUser(user.id)
  let canCreateBusiness = false
  
  if (businesses.length > 0) {
    canCreateBusiness = await hasPermission(user.id, businesses[0].id, "businesses", "create")
  } else {
    // Si no hay negocios, permitir crear el primero
    canCreateBusiness = true
  }

  if (!canCreateBusiness) {
    redirect("/businesses")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Negocio</h1>
        <p className="text-muted-foreground">Registra una nueva empresa o autónomo para la facturación electrónica</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <BusinessForm userId={user.id.toString()} />
      </div>
    </div>
  )
}
