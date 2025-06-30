import { Suspense } from "react"
import { getCurrentUser } from "@/lib/auth"
import { getBusinessesForUser } from "@/lib/getBusinessesForUser"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { BusinessSelector } from "@/components/dashboard/business-selector"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"

interface DashboardPageProps {
  searchParams: {
    startDate?: string
    endDate?: string
    period?: string
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser()
  const businesses = await getBusinessesForUser(user?.id)
  const activeBusinessId = await getActiveBusiness()

  console.log("Renderizando página de dashboard con filtros:", searchParams)

  return (
    <div className="w-full py-4 space-y-5">
      {/* Saludo al usuario activo */}
      <div style={{ background: "#f5f5f5", padding: "8px", borderRadius: "6px", marginBottom: "16px" }}>
        <strong>Hola {user?.name || user?.email || "Usuario"}!</strong>
      </div>
      <DashboardHeader />
      <BusinessSelector businesses={businesses} activeBusinessId={activeBusinessId} />
      <DashboardFilters />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats businessId={activeBusinessId} searchParams={searchParams} />
        <DashboardCharts businessId={activeBusinessId} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
