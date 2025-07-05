"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Edit, Eye, MoreHorizontal, Trash, PlusCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import { changeProjectStatus, deleteProject, getProjects } from "@/app/(dashboard)/projects/actions"

interface Client {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  status: "won" | "lost" | "pending"
  startDate: Date | null
  endDate: Date | null
  contractUrl: string | null
  client: Client | null
  clientId: string | null
}

export function ProjectList({ canCreateProject }: { canCreateProject: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"table" | "cards">("table")

  // Cargar proyectos cuando cambian los parámetros de búsqueda
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      try {
        const status = searchParams.get("status") || undefined
        const clientId = searchParams.get("clientId") || undefined
        const startDate = searchParams.get("startDate") || undefined
        const endDate = searchParams.get("endDate") || undefined
        const search = searchParams.get("search") || undefined

        const projectsData = await getProjects({
          status,
          clientId,
          startDate,
          endDate,
          search,
        })

        setProjects(projectsData)
      } catch (error) {
        console.error("Error al cargar proyectos:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los proyectos",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
    // Usar searchParams.toString() como dependencia en lugar del objeto searchParams
  }, [searchParams.toString(), toast])

  // Cambiar el estado de un proyecto
  const handleStatusChange = async (projectId: string, newStatus: "won" | "lost" | "pending") => {
    try {
      await changeProjectStatus(projectId, newStatus)

      // Actualizar el estado local para evitar recargar todos los proyectos
      setProjects((prevProjects) =>
        prevProjects.map((project) => (project.id === projectId ? { ...project, status: newStatus } : project)),
      )

      toast({
        title: "Estado actualizado",
        description: "El estado del proyecto ha sido actualizado",
      })
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del proyecto",
        variant: "destructive",
      })
    }
  }

  // Eliminar un proyecto
  const handleDelete = async (projectId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
      return
    }

    try {
      await deleteProject(projectId)

      // Actualizar el estado local para evitar recargar todos los proyectos
      setProjects((prevProjects) => prevProjects.filter((project) => project.id !== projectId))

      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado correctamente",
      })
    } catch (error) {
      console.error("Error al eliminar proyecto:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto",
        variant: "destructive",
      })
    }
  }

  // Renderizar la vista de tabla
  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha inicio</TableHead>
            <TableHead>Fecha fin</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No hay proyectos que coincidan con los filtros
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.client?.name || "Sin cliente"}</TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell>
                  {project.startDate
                    ? format(new Date(project.startDate), "dd/MM/yyyy", { locale: es })
                    : "No definida"}
                </TableCell>
                <TableCell>
                  {project.endDate ? format(new Date(project.endDate), "dd/MM/yyyy", { locale: es }) : "No definida"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menú</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  // Renderizar la vista de tarjetas
  const renderCardsView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.length === 0 ? (
        <div className="col-span-full text-center py-4">No hay proyectos que coincidan con los filtros</div>
      ) : (
        projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                  <CardDescription>{project.client?.name || "Sin cliente asignado"}</CardDescription>
                </div>
                <ProjectStatusBadge status={project.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha inicio:</span>
                  <span>
                    {project.startDate
                      ? format(new Date(project.startDate), "dd/MM/yyyy", { locale: es })
                      : "No definida"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha fin:</span>
                  <span>
                    {project.endDate ? format(new Date(project.endDate), "dd/MM/yyyy", { locale: es }) : "No definida"}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/projects/${project.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {canCreateProject && (
          <Button asChild>
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Proyecto
            </Link>
          </Button>
        )}
        <Tabs value={view} onValueChange={(v) => setView(v as "table" | "cards")}>
          <TabsList>
            <TabsTrigger value="table">Tabla</TabsTrigger>
            <TabsTrigger value="cards">Tarjetas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div>{view === "table" ? renderTableView() : renderCardsView()}</div>
      )}
    </div>
  )
}
