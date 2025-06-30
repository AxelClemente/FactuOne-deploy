"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, FileCheck, FileClock, FileText, Folder } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardData, type DashboardData } from "@/app/(dashboard)/dashboard/actions"

interface DashboardStatsProps {
  businessId: string | null
  searchParams: {
    startDate?: string
    endDate?: string
    period?: string
  }
}

export function DashboardStats({ businessId, searchParams }: DashboardStatsProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!businessId) {
        setData(null)
        setLoading(false)
        return
      }
      try {
        // Convertir parámetros de fecha
        const startDate = searchParams.startDate ? new Date(searchParams.startDate) : undefined
        const endDate = searchParams.endDate ? new Date(searchParams.endDate) : undefined

        console.log("Cargando datos del dashboard con filtros:", { businessId, startDate, endDate })

        // Usar el businessId real
        const dashboardData = await getDashboardData(businessId, startDate, endDate)
        setData(dashboardData)
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [businessId, searchParams.startDate, searchParams.endDate, searchParams.period])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="h-4 w-1/2 bg-muted rounded"></CardTitle>
              <div className="h-8 w-8 rounded-full bg-muted"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 w-1/3 bg-muted rounded mb-1"></div>
              <div className="h-4 w-1/2 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-8">No se pudieron cargar los datos del dashboard.</div>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ingresos (período)</CardTitle>
          <ArrowUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.yearToDateIncome)}</div>
          <p className="text-xs text-muted-foreground">Total de ingresos en el período seleccionado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Gastos (período)</CardTitle>
          <ArrowDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.yearToDateExpenses)}</div>
          <p className="text-xs text-muted-foreground">Total de gastos en el período seleccionado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Facturas emitidas</CardTitle>
          <FileText className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalInvoices}</div>
          <p className="text-xs text-muted-foreground">{data.pendingInvoices} pendientes de cobro</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Facturas recibidas</CardTitle>
          <FileCheck className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalReceivedInvoices}</div>
          <p className="text-xs text-muted-foreground">Facturas recibidas en el período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Proyectos ganados</CardTitle>
          <Folder className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.wonProjects}</div>
          <p className="text-xs text-muted-foreground">
            {((data.wonProjects / (data.wonProjects + data.lostProjects || 1)) * 100).toFixed(0)}% tasa de éxito
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Proyectos perdidos</CardTitle>
          <Folder className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.lostProjects}</div>
          <p className="text-xs text-muted-foreground">
            {((data.lostProjects / (data.wonProjects + data.lostProjects || 1)) * 100).toFixed(0)}% tasa de pérdida
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Proyectos pendientes</CardTitle>
          <FileClock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pendingProjects}</div>
          <p className="text-xs text-muted-foreground">En espera de resolución</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Balance del período</CardTitle>
          <ArrowUp
            className={`h-4 w-4 ${data.yearToDateIncome > data.yearToDateExpenses ? "text-emerald-500" : "text-red-500"}`}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.yearToDateIncome - data.yearToDateExpenses)}</div>
          <p className="text-xs text-muted-foreground">Ingresos - Gastos</p>
        </CardContent>
      </Card>
    </div>
  )
}
