import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ReceivedInvoiceForm } from "@/components/received-invoices/received-invoice-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getReceivedInvoiceById, getExpenseCategories } from "@/app/(dashboard)/received-invoices/actions"
import { getProjectsForBusiness } from "@/app/(dashboard)/invoices/actions"

export default async function EditReceivedInvoicePage({ params }: { params: { id: string } }) {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener el negocio activo (como objeto)
  const business = await getActiveBusiness()
  if (!business) {
    redirect("/businesses")
  }

  const resolvedParams = await params;

  try {
    // Obtener la factura recibida
    const invoice = await getReceivedInvoiceById(resolvedParams.id)

    // Verificar que la factura existe
    if (!invoice) {
      notFound()
    }

    // Verificar que la factura pertenece al negocio activo
    if (invoice.businessId !== business.id) {
      redirect("/received-invoices")
    }

    // Obtener las categorías de gastos y mapearlas correctamente
    const categories = (await getExpenseCategories()).map(cat => ({ id: cat, name: cat }));

    // Obtener los proyectos del negocio activo
    const projects = await getProjectsForBusiness(business.id)

    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href={`/received-invoices/${resolvedParams.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a detalles
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Editar factura recibida</h1>
          <p className="text-muted-foreground">Modifica los detalles de la factura recibida</p>
        </div>

        <ReceivedInvoiceForm categories={categories} invoice={invoice} projects={projects} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
