import { Badge } from "@/components/ui/badge"

type ReceivedInvoiceStatus = "pending" | "recorded" | "rejected"

interface ReceivedInvoiceStatusBadgeProps {
  status: ReceivedInvoiceStatus
}

export function ReceivedInvoiceStatusBadge({ status }: ReceivedInvoiceStatusBadgeProps) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pendiente</Badge>
    case "recorded":
      return (
        <Badge variant="success" className="bg-emerald-500 hover:bg-emerald-600">
          Contabilizada
        </Badge>
      )
    case "rejected":
      return <Badge variant="destructive">Rechazada</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}
