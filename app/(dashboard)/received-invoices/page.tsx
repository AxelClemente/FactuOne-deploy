import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { ReceivedInvoiceFilters } from "@/components/received-invoices/received-invoice-filters"
import { ReceivedInvoiceList } from "@/components/received-invoices/received-invoice-list"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getReceivedInvoices, getExpenseCategories } from "./actions"

export default async function ReceivedInvoicesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const activeBusiness = await getActiveBusiness()
  if (!activeBusiness) {
    redirect("/businesses")
  }

  // Comprobar permiso granular para crear facturas recibidas
  const canCreateReceivedInvoice = await hasPermission(user.id, activeBusiness.id.toString(), "received_invoices", "create")
  console.log("[RECEIVED INVOICES PAGE] user.id:", user.id)
  console.log("[RECEIVED INVOICES PAGE] activeBusiness.id:", activeBusiness.id)
  console.log("[RECEIVED INVOICES PAGE] canCreateReceivedInvoice:", canCreateReceivedInvoice)
  console.log("[RECEIVED INVOICES PAGE] user.id type:", typeof user.id)
  console.log("[RECEIVED INVOICES PAGE] activeBusiness.id type:", typeof activeBusiness.id)

  const resolvedSearchParams = await searchParams

  const categoriesStrings = await getExpenseCategories()
  const categories = categoriesStrings.map((cat) => ({ id: cat, name: cat }))

  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined
  const category = typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : undefined
  const startDate = resolvedSearchParams.startDate ? new Date(resolvedSearchParams.startDate as string) : undefined
  const endDate = resolvedSearchParams.endDate ? new Date(resolvedSearchParams.endDate as string) : undefined
  const searchTerm = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : undefined

  const initialInvoices = await getReceivedInvoices({
    businessId: activeBusiness.id,
    status,
    category,
    startDate,
    endDate,
    searchTerm,
  })

  return (
    <div className="w-full px-4 py-4 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas recibidas</h1>
          <p className="text-muted-foreground">Gestiona las facturas de tus proveedores y gastos</p>
        </div>
        {/* El botón de Registrar factura se gestiona en ReceivedInvoiceList según el permiso */}
      </div>

      <div className="space-y-5">
        {/* Filtros */}
        <ReceivedInvoiceFilters categories={categories} />

        {/* Lista de facturas */}
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <ReceivedInvoiceList
            businessId={activeBusiness.id}
            initialInvoices={initialInvoices}
            categories={categories}
            canCreateReceivedInvoice={canCreateReceivedInvoice}
          />
        </Suspense>
      </div>
    </div>
  )
}
