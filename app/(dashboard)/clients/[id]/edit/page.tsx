import { notFound, redirect } from "next/navigation"
import { ClientForm } from "@/components/clients/client-form"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getDb } from "@/lib/db"
import { eq } from "drizzle-orm"
import { clients } from "@/app/db/schema"

console.log("DEBUG: import clients from schema:", clients)

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params as required by Next.js 15
  const { id } = await params
  
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

  // Obtener el cliente a editar
  const db = await getDb()
  console.log("DEBUG: db instance:", db)
  const client = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  console.log("DEBUG: client query result:", client)

  if (!client || client.length === 0) {
    notFound()
  }

  // Verificar que el cliente pertenece al negocio activo
  if (client[0].businessId !== activeBusiness.id) {
    // El cliente no pertenece al negocio activo
    redirect("/clients")
  }

  // Convertir el cliente para que coincida con el tipo esperado por ClientForm
  const clientForForm = {
    id: client[0].id.toString(), // Convertir number a string
    name: client[0].name,
    nif: client[0].nif,
    address: client[0].address,
    email: client[0].email,
    phone: client[0].phone,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Editar Cliente</h1>
        <p className="text-muted-foreground">Actualiza la información del cliente</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <ClientForm businessId={activeBusiness.id.toString()} client={clientForForm} />
      </div>
    </div>
  )
}
