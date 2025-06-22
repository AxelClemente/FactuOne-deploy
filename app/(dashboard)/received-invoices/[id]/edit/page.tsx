import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ReceivedInvoiceForm } from "@/components/received-invoices/received-invoice-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getReceivedInvoiceById, getExpenseCategories } from "@/app/(dashboard)/received-invoices/actions"

export default async function EditReceivedInvoicePage({ params }: { params: { id: string } }) {
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
    // Obtener la factura recibida
    const invoice = await getReceivedInvoiceById(params.id)

    // Verificar que la factura pertenece al negocio activo
    if (invoice.businessId !== businessId) {
      redirect("/received-invoices")
    }

    // Obtener las categorías de gastos
   const categories = await getExpenseCategories();
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href={`/received-invoices/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a detalles
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Editar factura recibida</h1>
          <p className="text-muted-foreground">Modifica los detalles de la factura recibida</p>
        </div>

        <ReceivedInvoiceForm categories={categories} invoice={invoice} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
