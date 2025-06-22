import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ReceivedInvoiceDetail } from "@/components/received-invoices/received-invoice-detail"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getReceivedInvoiceById, getExpenseCategories } from "@/app/(dashboard)/received-invoices/actions"

export default async function ReceivedInvoiceDetailPage({ params }: { params: { id: string } }) {
  // Esperar a que los params se resuelvan (Fix para Next.js 15)
  const resolvedParams = await params

  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const activeBusinessId = await getActiveBusiness()
  if (!activeBusinessId) {
    redirect("/businesses")
  }

  const invoiceId = parseInt(resolvedParams.id, 10)
  if (isNaN(invoiceId)) {
    notFound()
  }

  try {
    const invoice = await getReceivedInvoiceById(invoiceId)

    if (!invoice) {
      notFound()
    }

    if (invoice.businessId !== parseInt(activeBusinessId, 10)) {
      redirect("/received-invoices")
    }

    const categoriesStrings = await getExpenseCategories()
    const categories = categoriesStrings.map((cat) => ({ id: cat, name: cat }))

    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/received-invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a facturas recibidas
          </Link>
        </Button>

        <ReceivedInvoiceDetail invoice={invoice} categories={categories} />
      </div>
    )
  } catch (error) {
    console.error("Error al cargar la página de detalles de la factura:", error)
    notFound()
  }
}
