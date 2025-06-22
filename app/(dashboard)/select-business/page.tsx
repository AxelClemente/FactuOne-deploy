import { redirect } from "next/navigation"
import { BusinessSelector } from "@/components/businesses/business-selector"
import { getCurrentUser } from "@/lib/auth"
import { getBusinessesForUser } from "@/lib/db"

export default async function SelectBusinessPage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener los negocios del usuario
  const businesses = await getBusinessesForUser(user.id)

  // Si el usuario no tiene negocios, redirigir a la página de creación
  if (businesses.length === 0) {
    redirect("/businesses/new")
  }

  return (
    <div className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
      <div className="w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Seleccionar Negocio</h1>
          <p className="text-muted-foreground">Elige el negocio con el que deseas trabajar</p>
        </div>

        <BusinessSelector businesses={businesses} />
      </div>
    </div>
  )
}
