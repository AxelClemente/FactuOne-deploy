import { redirect } from "next/navigation"
import { ReceivedInvoiceForm } from "@/components/received-invoices/received-invoice-form"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getExpenseCategories } from "@/app/(dashboard)/received-invoices/actions"
import { getProviders } from "@/app/(dashboard)/proveedores/actions"
import { getProjectsForBusiness } from "@/app/(dashboard)/invoices/actions"

export default async function NewReceivedInvoicePage() {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener el negocio activo
  const businessId = await getActiveBusiness()
  if (!businessId) {
    redirect("/businesses")
  }

  // Comprobar permiso granular para crear facturas recibidas
  const canCreate = await hasPermission(user.id, businessId.toString(), "received_invoices", "create");
  if (!canCreate) {
    redirect("/received-invoices");
  }

  // Obtener las categorías de gastos
  const categoriesStrings = await getExpenseCategories()
  const categories = categoriesStrings.map((cat) => ({ id: cat, name: cat }))

  // Obtener proveedores del negocio activo
  const providers = await getProviders(businessId)
  const providerOptions = providers.map((p) => ({ id: p.id, name: p.name, nif: p.nif }))

  // Obtener proyectos del negocio activo
  const projects = await getProjectsForBusiness(businessId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Registrar factura recibida</h1>
        <p className="text-muted-foreground">Registra una nueva factura de un proveedor</p>
      </div>

      <ReceivedInvoiceForm categories={categories} providers={providerOptions} projects={projects} />
    </div>
  )
}
