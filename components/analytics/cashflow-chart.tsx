"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Bar, BarChart } from "recharts"
import { Loader2 } from "lucide-react"

interface CashflowData {
  date: string
  inflow: number
  outflow: number
  net: number
}

interface CashflowChartProps {
  searchParams: {
    startDate?: string
    endDate?: string
    period?: string
  }
}

export function CashflowChart({ searchParams }: CashflowChartProps) {
  const [data, setData] = useState<CashflowData[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<"line" | "bar">("line")

  useEffect(() => {
    loadCashflowData()
  }, [searchParams])

  const loadCashflowData = async () => {
    setLoading(true)
    try {
      // Simular carga de datos
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Datos mock para el gráfico
      const mockData: CashflowData[] = [
        { date: "01/01", inflow: 15000, outflow: 8000, net: 7000 },
        { date: "02/01", inflow: 18000, outflow: 9500, net: 8500 },
        { date: "03/01", inflow: 12000, outflow: 7200, net: 4800 },
        { date: "04/01", inflow: 22000, outflow: 11000, net: 11000 },
        { date: "05/01", inflow: 16000, outflow: 8800, net: 7200 },
        { date: "06/01", inflow: 19000, outflow: 10200, net: 8800 },
        { date: "07/01", inflow: 14000, outflow: 7800, net: 6200 },
      ]

      setData(mockData)
    } catch (error) {
      console.error("Error cargando datos de cashflow:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controles del gráfico */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-1 text-sm rounded ${
              chartType === "line" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            Líneas
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`px-3 py-1 text-sm rounded ${
              chartType === "bar" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            Barras
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data}>
              <XAxis dataKey="date" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "inflow" ? "Ingresos" : name === "outflow" ? "Gastos" : "Neto",
                ]}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Legend
                formatter={(value) => (value === "inflow" ? "Ingresos" : value === "outflow" ? "Gastos" : "Neto")}
              />
              <Line type="monotone" dataKey="inflow" stroke="#22c55e" strokeWidth={2} name="inflow" />
              <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} name="outflow" />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="net" />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <XAxis dataKey="date" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "inflow" ? "Ingresos" : name === "outflow" ? "Gastos" : "Neto",
                ]}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Legend
                formatter={(value) => (value === "inflow" ? "Ingresos" : value === "outflow" ? "Gastos" : "Neto")}
              />
              <Bar dataKey="inflow" fill="#22c55e" name="inflow" />
              <Bar dataKey="outflow" fill="#ef4444" name="outflow" />
              <Bar dataKey="net" fill="#3b82f6" name="net" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
