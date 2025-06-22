import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"
import { eq, and } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { projects, clients } from "@/app/db/schema"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { Button } from "@/components/ui/button"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params
  const businessId = await getActiveBusiness()
  const db = await getDb()

  if (!businessId) {
    redirect("/select-business")
  }

  const projectId = parseInt(resolvedParams.id, 10)
  if (isNaN(projectId)) {
    return notFound()
  }

  const [projectData] = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      contractUrl: projects.contractUrl,
      businessId: projects.businessId,
      client: {
        id: clients.id,
        name: clients.name,
      },
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, projectId), eq(projects.businessId, parseInt(businessId))))

  if (!projectData) {
    return notFound()
  }

  const project = { ...projectData, client: projectData.client?.id ? projectData.client : null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="link" className="px-0" asChild>
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a proyectos
            </Link>
          </Button>
          <h2 className="text-2xl font-bold">{project.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/${project.id}/edit`}>Editar</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-2">Información general</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Estado:</dt>
                <dd>
                  <ProjectStatusBadge status={project.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Cliente:</dt>
                <dd>
                  {project.client ? (
                    <Link href={`/clients/${project.client.id}`} className="text-blue-600 hover:underline">
                      {project.client.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Sin cliente</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Fecha de inicio:</dt>
                <dd>
                  {project.startDate ? (
                    format(new Date(project.startDate), "dd/MM/yyyy", { locale: es })
                  ) : (
                    <span className="text-muted-foreground">No especificada</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Fecha de fin:</dt>
                <dd>
                  {project.endDate ? (
                    format(new Date(project.endDate), "dd/MM/yyyy", { locale: es })
                  ) : (
                    <span className="text-muted-foreground">No especificada</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {project.contractUrl && (
            <div className="rounded-md border p-4">
              <h3 className="text-lg font-medium mb-2">Documentos</h3>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <FileText className="h-5 w-5 text-blue-500" />
                <a
                  href={project.contractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex-1 truncate"
                >
                  Contrato del proyecto
                </a>
                <Button size="sm" variant="outline" asChild>
                  <a href={project.contractUrl} target="_blank" rel="noopener noreferrer">
                    Ver
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-2">Facturas relacionadas</h3>
            <p className="text-muted-foreground">Este proyecto aún no tiene facturas asociadas.</p>
            <div className="mt-4">
              <Button size="sm" asChild>
                <Link href={`/invoices/new?projectId=${project.id}`}>Crear factura</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
