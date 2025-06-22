import { redirect } from "next/navigation"
import { BusinessForm } from "@/components/businesses/business-form"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function NewBusinessPage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
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
