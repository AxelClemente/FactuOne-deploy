"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarRange, Edit, ExternalLink, Trash, User } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import { deleteProject } from "@/app/(dashboard)/projects/actions"

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
}

interface Invoice {
  id: string
  number: string
  date: Date
  total: number
  status: string
  client: {
    id: string
    name: string
  }
}

interface ProjectDetailProps {
  project: Project
  invoices?: Invoice[]
}

export function ProjectDetail({ project, invoices = [] }: ProjectDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteProject(project.id)
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado correctamente",
      })
      router.push("/projects")
    } catch (error) {
      console.error("Error al eliminar proyecto:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <ProjectStatusBadge status={project.status} />
            {project.client && (
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-1" />
                {project.client.name}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/${project.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Eliminar proyecto?</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer. El proyecto será eliminado permanentemente.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Eliminando..." : "Eliminar proyecto"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del proyecto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                <p className="mt-1">
                  <ProjectStatusBadge status={project.status} />
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
                <p className="mt-1">{project.client?.name || "Sin cliente"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Fechas</h3>
              <div className="mt-1 flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <span>
                  {project.startDate
                    ? format(new Date(project.startDate), "dd/MM/yyyy", { locale: es })
                    : "No definida"}{" "}
                  - {project.endDate ? format(new Date(project.endDate), "dd/MM/yyyy", { locale: es }) : "No definida"}
                </span>
              </div>
            </div>

            {project.contractUrl && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Contrato</h3>
                <div className="mt-1">
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <a
                      href={project.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver contrato
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturas asociadas</CardTitle>
            <CardDescription>Facturas vinculadas a este proyecto</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay facturas asociadas a este proyecto</p>
            ) : (
              <ul className="space-y-2">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Factura #{invoice.number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.date), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        }).format(invoice.total)}
                      </p>
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <Link href={`/invoices/${invoice.id}`}>Ver factura</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/invoices/new">Crear nueva factura</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
