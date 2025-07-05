import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { clients as clientsTable } from "@/app/db/schema"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { ProjectFilters } from "@/components/projects/project-filters"
import { ProjectList } from "@/components/projects/project-list"
import { redirect } from "next/navigation"

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }

  // Comprobar permiso granular para crear proyectos
  const canCreateProject = await hasPermission(user.id, activeBusiness.id.toString(), "projects", "create")
  console.log("[PROJECTS PAGE] user.id:", user.id)
  console.log("[PROJECTS PAGE] activeBusiness.id:", activeBusiness.id)
  console.log("[PROJECTS PAGE] canCreateProject:", canCreateProject)
  console.log("[PROJECTS PAGE] user.id type:", typeof user.id)
  console.log("[PROJECTS PAGE] activeBusiness.id type:", typeof activeBusiness.id)

  let clients: { id: string; name: string }[] = []
  if (activeBusiness) {
    const db = await getDb()
    const clientsData = await db
      .select({
        id: clientsTable.id,
        name: clientsTable.name,
      })
      .from(clientsTable)
      .where(eq(clientsTable.businessId, activeBusiness.id))

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
        {/* El botón de Nuevo Proyecto se gestiona en ProjectList según el permiso */}
      </div>

      <ProjectFilters clients={clients} />
      <ProjectList canCreateProject={canCreateProject} />
    </div>
  )
}
