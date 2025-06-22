import Link from "next/link"
import { redirect } from "next/navigation"
import { BusinessList } from "@/components/businesses/business-list"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getBusinessesForUser } from "@/lib/db"
import { PlusCircle } from "lucide-react"

export default async function BusinessesPage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener los negocios del usuario
  const businesses = await getBusinessesForUser(user.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Negocios</h1>
          <p className="text-muted-foreground">Gestiona tus empresas y autónomos para la facturación electrónica</p>
        </div>
        <Button asChild>
          <Link href="/businesses/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Negocio
          </Link>
        </Button>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">No tienes negocios registrados</h2>
          <p className="mb-4 text-muted-foreground">Para comenzar a utilizar el CRM, crea tu primer negocio.</p>
          <Button asChild>
            <Link href="/businesses/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear mi primer negocio
            </Link>
          </Button>
        </div>
      ) : (
        <BusinessList businesses={businesses} />
      )}
    </div>
  )
}
