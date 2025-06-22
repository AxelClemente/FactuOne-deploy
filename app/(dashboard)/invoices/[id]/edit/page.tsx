import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getInvoiceWithLines, getClientsForBusiness } from "@/app/(dashboard)/invoices/actions"

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
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

  try {
    // Obtener la factura con sus líneas
    const invoice = await getInvoiceWithLines(params.id)

    // Verificar que la factura pertenece al negocio activo
    if (invoice.businessId !== businessId) {
      redirect("/invoices")
    }

    // Verificar si la factura se puede editar (no está pagada ni cancelada)
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      redirect(`/invoices/${params.id}`)
    }

    // Obtener los clientes del negocio
    const clients = await getClientsForBusiness(businessId)

    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href={`/invoices/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a detalles
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Editar factura</h1>
          <p className="text-muted-foreground">Modifica los detalles de la factura {invoice.number}</p>
        </div>

        <InvoiceForm clients={clients} invoice={invoice} invoiceLines={invoice.lines} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
