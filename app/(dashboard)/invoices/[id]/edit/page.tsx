import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getInvoiceWithLines, getClientsForBusiness } from "@/app/(dashboard)/invoices/actions"

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  // Obtener el usuario actual
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Obtener el negocio activo
  const business = await getActiveBusiness()
  if (!business) {
    redirect("/businesses")
  }
  const businessId = typeof business === "object" ? business.id : business;

  // Esperar por los parámetros de la ruta
  const { id } = await params

  console.log(`[EditInvoicePage] Intentando editar factura con ID: ${id}`)
  console.log(`[EditInvoicePage] Business ID activo: ${businessId}`)

  try {
    // Obtener la factura con sus líneas
    console.log(`[EditInvoicePage] Llamando a getInvoiceWithLines con ID: ${parseInt(id)}`)
    const invoice = await getInvoiceWithLines(parseInt(id))
    console.log(`[EditInvoicePage] Factura obtenida:`, invoice)

    // Verificar que la factura pertenece al negocio activo
    if (invoice.businessId !== businessId) {
      console.log(`[EditInvoicePage] La factura pertenece al negocio ${invoice.businessId}, pero el negocio activo es ${businessId}`)
      redirect("/invoices")
    }

    // Verificar si la factura se puede editar (no está pagada ni cancelada)
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      redirect(`/invoices/${id}`)
    }

    // Obtener los clientes del negocio
    const clients = await getClientsForBusiness(businessId)
    
    // Convertir los IDs de los clientes de number a string para el formulario
    const clientsForForm = clients.map(client => {
      const { id, ...rest } = client;
      return {
        ...rest,
        id: id.toString()
      };
    })

    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href={`/invoices/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a detalles
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Editar factura</h1>
          <p className="text-muted-foreground">Modifica los detalles de la factura {invoice.number}</p>
        </div>

        <InvoiceForm clients={clientsForForm} invoice={invoice} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
