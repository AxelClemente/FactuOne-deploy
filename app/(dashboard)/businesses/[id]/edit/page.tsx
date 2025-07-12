import { notFound, redirect } from "next/navigation"
import { BusinessForm } from "@/components/businesses/business-form"
import { getCurrentUser } from "@/lib/auth"
import { getDb, getBusinessesForUser } from "@/lib/db"
import { eq } from "drizzle-orm"
import { businesses } from "@/app/db/schema"

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params as required by Next.js 15
  const { id } = await params
  
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener el negocio a editar
  const db = await getDb()
  const business = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1)

  if (!business || business.length === 0) {
    notFound()
  }

  // Verificar permisos granulares para editar negocios
  const { hasPermission } = await import("@/lib/auth")
  const canEditBusiness = await hasPermission(user.id, business[0].id, "businesses", "edit")
  
  if (!canEditBusiness) {
    // El usuario no tiene permisos para editar negocios
    redirect("/businesses")
  }

  // Convertir el negocio para que coincida con el tipo esperado por BusinessForm
  const businessForForm = {
    id: business[0].id, // Ya es string
    name: business[0].name,
    nif: business[0].nif,
    fiscalAddress: business[0].fiscalAddress,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Editar Negocio</h1>
        <p className="text-muted-foreground">Actualiza la información de tu empresa o autónomo</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <BusinessForm userId={user.id} business={businessForForm} />
      </div>
    </div>
  )
}
