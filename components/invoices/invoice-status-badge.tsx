import { Badge } from "@/components/ui/badge"

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pendiente</Badge>
    case "paid":
      return (
        <Badge variant="success" className="bg-emerald-500 hover:bg-emerald-600">
          Pagada
        </Badge>
      )
    case "overdue":
      return <Badge variant="destructive">Vencida</Badge>
    case "cancelled":
      return (
        <Badge variant="outline" className="border-gray-400 text-gray-500">
          Cancelada
        </Badge>
      )
    default:
      return <Badge>{status}</Badge>
  }
}
