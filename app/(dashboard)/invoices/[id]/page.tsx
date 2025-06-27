import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { InvoiceDetail } from "@/components/invoices/invoice-detail"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getInvoiceWithLines } from "@/app/(dashboard)/invoices/actions"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  try {
    const { id } = await params // Await params
    const invoice = await getInvoiceWithLines(id) // Usar el ID directamente como string

    // Verificar que la factura pertenece al negocio activo
    if (invoice.businessId !== activeBusiness.id) {
      redirect("/invoices")
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a facturas
          </Link>
        </Button>

        <InvoiceDetail invoice={invoice} client={invoice.client} lines={invoice.lines} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
