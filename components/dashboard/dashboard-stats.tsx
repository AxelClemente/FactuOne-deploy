"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
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

export function DashboardStats({ businessId, searchParams: initialSearchParams }: DashboardStatsProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Usar useSearchParams para reaccionar a cambios de URL en tiempo real
  const searchParams = useSearchParams()
  const currentSearchParams = {
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    period: searchParams.get("period") || undefined,
  }

  console.log("🔄 DashboardStats renderizado con props:", {
    businessId,
    initialSearchParams,
    currentSearchParams,
    hasData: !!data,
    isLoading: loading
  })

  useEffect(() => {
    console.log("🔄 DashboardStats useEffect ejecutándose con dependencias:", {
      businessId,
      startDate: currentSearchParams.startDate,
      endDate: currentSearchParams.endDate,
      period: currentSearchParams.period
    })

    async function fetchData() {
      if (!businessId) {
        console.log("❌ No hay businessId, limpiando datos")
        setData(null)
        setLoading(false)
        return
      }
      try {
        console.log("🚀 Iniciando fetchData con parámetros:", {
          businessId,
          startDate: currentSearchParams.startDate,
          endDate: currentSearchParams.endDate,
          period: currentSearchParams.period
        })

        // Convertir parámetros de fecha
        const startDate = currentSearchParams.startDate ? new Date(currentSearchParams.startDate) : undefined
        const endDate = currentSearchParams.endDate ? new Date(currentSearchParams.endDate) : undefined

        console.log("📅 Fechas convertidas:", { startDate, endDate })

        // Usar el businessId real y pasar el parámetro period
        const dashboardData = await getDashboardData(businessId, startDate, endDate, currentSearchParams.period)
        
        console.log("✅ Datos obtenidos del dashboard:", dashboardData)
        setData(dashboardData)
      } catch (error) {
        console.error("❌ Error al cargar datos del dashboard:", error)
      } finally {
        setLoading(false)
        console.log("🏁 fetchData completado, loading = false")
      }
    }

    fetchData()
  }, [businessId, currentSearchParams.startDate, currentSearchParams.endDate, currentSearchParams.period])

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
