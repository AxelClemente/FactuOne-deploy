"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface AccountData {
  id: string
  name: string
  category: "Income" | "Expense" | "Investment" | "Tax" | "Other"
  inflow: number
  outflow: number
  netBalance: number
}

interface AccountsTableProps {
  searchParams: {
    startDate?: string
    endDate?: string
    period?: string
  }
}

export function AccountsTable({ searchParams }: AccountsTableProps) {
  const [data, setData] = useState<AccountData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAccountsData()
  }, [searchParams])

  const loadAccountsData = async () => {
    setLoading(true)
    try {
      // Simular carga de datos
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Datos mock para la tabla
      const mockData: AccountData[] = [
        {
          id: "1",
          name: "Ventas de servicios",
          category: "Income",
          inflow: 45000,
          outflow: 0,
          netBalance: 45000,
        },
        {
          id: "2",
          name: "Ventas de productos",
          category: "Income",
          inflow: 32000,
          outflow: 0,
          netBalance: 32000,
        },
        {
          id: "3",
          name: "Gastos de oficina",
          category: "Expense",
          inflow: 0,
          outflow: 8500,
          netBalance: -8500,
        },
        {
          id: "4",
          name: "Marketing y publicidad",
          category: "Expense",
          inflow: 0,
          outflow: 12000,
          netBalance: -12000,
        },
        {
          id: "5",
          name: "Equipamiento",
          category: "Investment",
          inflow: 0,
          outflow: 15000,
          netBalance: -15000,
        },
        {
          id: "6",
          name: "IVA",
          category: "Tax",
          inflow: 0,
          outflow: 9500,
          netBalance: -9500,
        },
        {
          id: "7",
          name: "Seguros",
          category: "Other",
          inflow: 0,
          outflow: 2400,
          netBalance: -2400,
        },
      ]

      setData(mockData)
    } catch (error) {
      console.error("Error cargando datos de cuentas:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(Math.abs(value))
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Income":
        return "bg-green-100 text-green-800"
      case "Expense":
        return "bg-red-100 text-red-800"
      case "Investment":
        return "bg-blue-100 text-blue-800"
      case "Tax":
        return "bg-yellow-100 text-yellow-800"
      case "Other":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "Income":
        return "Ingresos"
      case "Expense":
        return "Gastos"
      case "Investment":
        return "Inversiones"
      case "Tax":
        return "Impuestos"
      case "Other":
        return "Otros"
      default:
        return category
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    )
  }

  // Calcular totales
  const totals = data.reduce(
    (acc, account) => ({
      inflow: acc.inflow + account.inflow,
      outflow: acc.outflow + account.outflow,
      netBalance: acc.netBalance + account.netBalance,
    }),
    { inflow: 0, outflow: 0, netBalance: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre de la cuenta</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Ingresos (EUR)</TableHead>
              <TableHead className="text-right">Gastos (EUR)</TableHead>
              <TableHead className="text-right">Balance neto (EUR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>
                  <Badge className={getCategoryColor(account.category)}>{getCategoryLabel(account.category)}</Badge>
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {account.inflow > 0 ? formatCurrency(account.inflow) : "-"}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {account.outflow > 0 ? formatCurrency(account.outflow) : "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${account.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {account.netBalance >= 0 ? "+" : "-"}
                  {formatCurrency(account.netBalance)}
                </TableCell>
              </TableRow>
            ))}
            {/* Fila de totales */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>TOTAL</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-right text-green-600">{formatCurrency(totals.inflow)}</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(totals.outflow)}</TableCell>
              <TableCell
                className={`text-right font-bold ${totals.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {totals.netBalance >= 0 ? "+" : "-"}
                {formatCurrency(totals.netBalance)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
