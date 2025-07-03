import { notFound, redirect } from "next/navigation"
import ProviderForm from "@/components/providers/provider-form"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getDb } from "@/lib/db"
import { eq } from "drizzle-orm"
import { providers } from "@/app/db/schema"

console.log("DEBUG: import providers from schema:", providers)

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) redirect("/businesses")

  const db = await getDb()
  console.log("DEBUG: db instance:", db)
  const provider = await db.select().from(providers).where(eq(providers.id, id)).limit(1)
  console.log("DEBUG: provider query result:", provider)

  if (!provider || provider.length === 0) notFound()
  if (provider[0].businessId !== activeBusiness.id) redirect("/proveedores")

  // Adaptar el objeto para el formulario
  const providerForForm = {
    id: provider[0].id,
    name: provider[0].name,
    nif: provider[0].nif,
    address: provider[0].address,
    postalCode: provider[0].postalCode || "",
    city: provider[0].city || "",
    country: provider[0].country || "",
    phone: provider[0].phone,
    email: provider[0].email,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Editar Proveedor</h1>
        <p className="text-muted-foreground">Actualiza la información del proveedor</p>
      </div>
      <div className="mx-auto max-w-2xl">
        <ProviderForm
          businessId={activeBusiness.id}
          provider={providerForForm}
        />
      </div>
    </div>
  )
} 