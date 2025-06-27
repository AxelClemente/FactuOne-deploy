import Link from "next/link"
import { Plus } from "lucide-react"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { clients as clientsTable } from "@/app/db/schema"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { Button } from "@/components/ui/button"
import { ProjectFilters } from "@/components/projects/project-filters"
import { ProjectList } from "@/components/projects/project-list"

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const activeBusinessId = await getActiveBusiness()

  let clients: { id: string; name: string }[] = []
  if (activeBusinessId) {
    const db = await getDb()
    const clientsData = await db
      .select({
        id: clientsTable.id,
        name: clientsTable.name,
      })
      .from(clientsTable)
      .where(eq(clientsTable.businessId, activeBusinessId))

    // Convertir IDs a string para los filtros
    clients = clientsData.map((c) => ({ 
      id: c.id.toString(), 
      name: c.name 
    }))
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Proyectos</h2>
          <p className="text-muted-foreground">Gestiona los proyectos de tu negocio</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Link>
        </Button>
      </div>

      <ProjectFilters clients={clients} />
      <ProjectList />
    </div>
  )
}
