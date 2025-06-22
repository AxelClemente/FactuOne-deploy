import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { clients as clientsTable } from "@/app/db/schema"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { ProjectForm } from "@/components/projects/project-form"

export const dynamic = 'force-dynamic'

export default async function NewProjectPage() {
  const activeBusinessId = await getActiveBusiness()
  if (!activeBusinessId) {
    redirect("/select-business")
  }

  const businessIdNumber = parseInt(activeBusinessId, 10)
  if (isNaN(businessIdNumber)) {
    redirect("/select-business")
  }

  const db = await getDb()
  const clients = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
    })
    .from(clientsTable)
    .where(eq(clientsTable.businessId, businessIdNumber))

  // Convertir IDs a string para el formulario
  const clientOptions = clients.map((client) => ({
    ...client,
    id: client.id.toString(),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Proyecto</h1>
        <p className="text-muted-foreground">Crea un nuevo proyecto para tu negocio</p>
      </div>
      <ProjectForm clients={clientOptions} />
    </div>
  )
}
