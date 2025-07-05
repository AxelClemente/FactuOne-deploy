import { Suspense } from "react"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AuditLogsTable } from "@/components/audit/audit-logs-table"
import { AuditStats } from "@/components/audit/audit-stats"
import { AuditFilters } from "@/components/audit/audit-filters"

export default async function AuditPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoría del Sistema</h1>
        <p className="text-muted-foreground">
          Registro completo de todas las acciones realizadas en el sistema
        </p>
      </div>

      <Suspense fallback={<div>Cargando estadísticas...</div>}>
        <AuditStats />
      </Suspense>

      <div className="space-y-4">
        <Suspense fallback={<div>Cargando filtros...</div>}>
          <AuditFilters />
        </Suspense>

        <Suspense fallback={<div>Cargando logs...</div>}>
          <AuditLogsTable />
        </Suspense>
      </div>
    </div>
  )
} 