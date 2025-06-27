import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { Button } from "@/components/ui/button"
import { ProjectForm } from "@/components/projects/project-form"
import { getProjectById } from "../../actions"
import { clients as clientsSchema, type Project } from "@/app/db/schema"

interface EditProjectPageProps {
  params: { id: string }
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  // El error de Next.js 15 sugiere esperar los params. Lo hacemos aquí.
  // const awaitedParams = await params;
  const businessId = await getActiveBusiness()
  const projectId = params.id // Usar como string (UUID)

  const project = (await getProjectById(projectId)) as Project | null

  if (!project) {
    notFound()
  }

  const db = await getDb()
  // Obtener clientes para el formulario con Drizzle
  const clientsData = businessId
    ? await db
        .select({ id: clientsSchema.id, name: clientsSchema.name })
        .from(clientsSchema)
        .where(eq(clientsSchema.businessId, businessId)) // Usar businessId como string
    : []

  // Mapear el id a string para el componente Select del formulario
  const clients = clientsData.map((c) => ({
    id: c.id.toString(),
    name: c.name || "Cliente sin nombre",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="link" className="px-0" asChild>
            <Link href={`/projects/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al proyecto
            </Link>
          </Button>
          <h2 className="text-2xl font-bold">Editar Proyecto</h2>
          <p className="text-muted-foreground">Modifica los detalles del proyecto</p>
        </div>
      </div>
      <div className="rounded-md border p-6">
        <ProjectForm clients={clients} project={project} />
      </div>
    </div>
  )
}
