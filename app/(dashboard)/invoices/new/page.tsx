import { redirect } from "next/navigation"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getClientsForBusiness, getProjectsForBusiness } from "@/app/(dashboard)/invoices/actions"
import { Client, Project } from "@/app/db/schema"

export default async function NewInvoicePage() {
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

  // Comprobar permiso granular para crear facturas emitidas
  const canCreate = await hasPermission(user.id, activeBusiness.id.toString(), "invoices", "create");
  if (!canCreate) {
    redirect("/invoices");
  }

  // Obtener los clientes del negocio y transformar los IDs a string
  const clientsFromDb = await getClientsForBusiness(activeBusiness.id)
  console.log("[NewInvoicePage] Clientes desde la BD:", clientsFromDb)

  const clients = clientsFromDb.map((client: Client) => ({
    ...client,
    id: client.id.toString(),
  }))
  console.log("[NewInvoicePage] Clientes pasados al formulario:", clients)

  // Obtener los proyectos del negocio y transformar los IDs a string
  const projectsFromDb = await getProjectsForBusiness(activeBusiness.id)
  console.log("[NewInvoicePage] Proyectos desde la BD:", projectsFromDb)

  const projects = projectsFromDb.map((project: Project) => ({
    id: project.id.toString(),
    name: project.name,
  }))
  console.log("[NewInvoicePage] Proyectos pasados al formulario:", projects)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Crear factura</h1>
        <p className="text-muted-foreground">Crea una nueva factura para un cliente</p>
      </div>

      <InvoiceForm clients={clients} projects={projects} />
    </div>
  )
}
