import { redirect } from "next/navigation"
import { ReceivedInvoiceForm } from "@/components/received-invoices/received-invoice-form"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getExpenseCategories } from "@/app/(dashboard)/received-invoices/actions"

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

  // Obtener las categorías de gastos
  const categoriesStrings = await getExpenseCategories()

  // Adaptar el formato de las categorías para el componente del formulario
  const categories = categoriesStrings.map((cat) => ({ id: cat, name: cat }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Registrar factura recibida</h1>
        <p className="text-muted-foreground">Registra una nueva factura de un proveedor</p>
      </div>

      <ReceivedInvoiceForm categories={categories} />
    </div>
  )
}
