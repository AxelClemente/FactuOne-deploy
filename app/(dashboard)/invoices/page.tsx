import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { InvoiceFilters } from "@/components/invoices/invoice-filters"
import { InvoiceList } from "@/components/invoices/invoice-list"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { getActiveBusiness } from "@/app/(dashboard)/businesses/actions"
import { getInvoicesForCurrentUser, getClientsForBusiness } from "@/app/(dashboard)/invoices/actions"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams

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
  const canCreateInvoice = await hasPermission(user.id, activeBusiness.id.toString(), "invoices", "create")
  console.log("[INVOICES PAGE] user.id:", user.id)
  console.log("[INVOICES PAGE] activeBusiness.id:", activeBusiness.id)
  console.log("[INVOICES PAGE] canCreateInvoice:", canCreateInvoice)
  console.log("[INVOICES PAGE] user.id type:", typeof user.id)
  console.log("[INVOICES PAGE] activeBusiness.id type:", typeof activeBusiness.id)

  // Obtener los clientes del negocio
  const clients = await getClientsForBusiness(activeBusiness.id)

  // Obtener los parámetros de búsqueda y convertir fechas correctamente
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined
  const clientId = typeof resolvedSearchParams.clientId === "string" ? resolvedSearchParams.clientId : undefined

  // Convertir fechas desde string a Date
  let startDate: Date | undefined
  let endDate: Date | undefined

  if (resolvedSearchParams.startDate && typeof resolvedSearchParams.startDate === "string") {
    startDate = new Date(resolvedSearchParams.startDate)
    console.log("[PAGE] Fecha inicio parseada:", startDate.toISOString())
  }

  if (resolvedSearchParams.endDate && typeof resolvedSearchParams.endDate === "string") {
    endDate = new Date(resolvedSearchParams.endDate)
    console.log("[PAGE] Fecha fin parseada:", endDate.toISOString())
  }

  const searchTerm = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : undefined

  console.log("[PAGE] Parámetros de búsqueda:", {
    status,
    clientId,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    searchTerm,
  })

  // Obtener las facturas iniciales
  const initialInvoices = await getInvoicesForCurrentUser({
    businessId: activeBusiness.id,
    status,
    clientId,
    startDate,
    endDate,
    searchTerm,
  })

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas emitidas</h1>
          <p className="text-muted-foreground">Gestiona las facturas emitidas a tus clientes</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Filtros */}
        <InvoiceFilters clients={clients} />

        {/* Lista de facturas */}
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <InvoiceList 
            businessId={activeBusiness.id} 
            initialInvoices={initialInvoices} 
            canCreateInvoice={canCreateInvoice}
          />
        </Suspense>
      </div>
    </div>
  )
}
