"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDashboardData, type MonthlyData } from "@/app/(dashboard)/dashboard/actions"

interface DashboardChartsProps {
  searchParams: {
    startDate?: string
    endDate?: string
    period?: string
  }
}

export function DashboardCharts({ searchParams }: DashboardChartsProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const dashboardData = await getDashboardData(
          "clb1234567890",
          searchParams.startDate ? new Date(searchParams.startDate) : undefined,
          searchParams.endDate ? new Date(searchParams.endDate) : undefined,
        )
        setMonthlyData(dashboardData.monthlyData)
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [searchParams])

  const formattedData = monthlyData.map((item) => {
    const [year, month] = item.month.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1)
    const monthName = date.toLocaleString("es-ES", { month: "short" })

    return {
      ...item,
      month: `${monthName}`,
      balance: item.income - item.expenses,
    }
  })

  if (loading) {
    return (
      <Card className="mt-6 animate-pulse">
        <CardHeader>
          <div className="h-6 w-1/3 bg-muted rounded mb-2"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>
        </CardHeader>
        <CardContent className="h-80 bg-muted/20 rounded"></CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Evolución financiera</CardTitle>
        <CardDescription>Comparativa de ingresos y gastos de los últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="table">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="table">Vista de tabla</TabsTrigger>
              <TabsTrigger value="summary">Resumen</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="table" className="space-y-4">
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Mes</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ingresos</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Gastos</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formattedData.map((item, index) => (
                      <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle font-medium">{item.month}</td>
                        <td className="p-4 align-middle text-emerald-600">
                          {new Intl.NumberFormat("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          }).format(item.income)}
                        </td>
                        <td className="p-4 align-middle text-red-600">
                          {new Intl.NumberFormat("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          }).format(item.expenses)}
                        </td>
                        <td
                          className={`p-4 align-middle font-medium ${item.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {new Intl.NumberFormat("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          }).format(item.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(formattedData.reduce((sum, item) => sum + item.income, 0))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(formattedData.reduce((sum, item) => sum + item.expenses, 0))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${formattedData.reduce((sum, item) => sum + item.balance, 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(formattedData.reduce((sum, item) => sum + item.balance, 0))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
