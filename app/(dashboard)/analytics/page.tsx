import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsFilters } from "@/components/analytics/analytics-filters"
import { CashflowChart } from "@/components/analytics/cashflow-chart"
import { AccountsTable } from "@/components/analytics/accounts-table"
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton"

interface AnalyticsPageProps {
  searchParams: {
    startDate?: string
    endDate?: string
    period?: string
  }
}

export default function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Analytics & Financial Overview</h1>
        <p className="text-muted-foreground">Análisis financiero y flujo de caja de tu negocio</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de análisis</CardTitle>
          <CardDescription>Selecciona el período de tiempo para analizar los datos financieros</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsFilters />
        </CardContent>
      </Card>

      {/* Contenido principal */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <div className="grid gap-6">
          {/* Gráfico de Cashflow */}
          <Card>
            <CardHeader>
              <CardTitle>Flujo de Caja</CardTitle>
              <CardDescription>Evolución de ingresos y gastos en el período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <CashflowChart searchParams={searchParams} />
            </CardContent>
          </Card>

          {/* Tabla de Cuentas */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Tipo de Cuenta</CardTitle>
              <CardDescription>Desglose detallado de movimientos por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              <AccountsTable searchParams={searchParams} />
            </CardContent>
          </Card>
        </div>
      </Suspense>
    </div>
  )
}
