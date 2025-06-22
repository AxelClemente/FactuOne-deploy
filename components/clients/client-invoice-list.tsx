import Link from "next/link"
import { FileCheck, FileText, FileClock, FileX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Invoice = {
  id: string
  date: string
  concept: string
  status: string
  total: number
}

export function ClientInvoiceList({ invoices }: { invoices: Invoice[] }) {
  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES").format(date)
  }

  // Obtener icono según estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <FileCheck className="h-4 w-4 text-emerald-500" />
      case "pending":
        return <FileClock className="h-4 w-4 text-amber-500" />
      case "overdue":
        return <FileX className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-blue-500" />
    }
  }

  // Obtener texto y variante de badge según estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { text: "Pagada", variant: "outline" as const }
      case "pending":
        return { text: "Pendiente", variant: "secondary" as const }
      case "overdue":
        return { text: "Vencida", variant: "destructive" as const }
      case "cancelled":
        return { text: "Cancelada", variant: "outline" as const }
      default:
        return { text: status, variant: "outline" as const }
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const { text, variant } = getStatusBadge(invoice.status)
            return (
              <TableRow key={invoice.id}>
                <TableCell>{formatDate(invoice.date)}</TableCell>
                <TableCell className="font-medium">{invoice.concept}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.status)}
                    <Badge variant={variant}>{text}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/invoices/${invoice.id}`}>Ver factura</Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
