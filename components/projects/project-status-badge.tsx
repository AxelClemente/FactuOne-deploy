import { Badge } from "@/components/ui/badge"

interface ProjectStatusBadgeProps {
  status: "won" | "lost" | "pending"
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  switch (status) {
    case "won":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ganado</Badge>
    case "lost":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Perdido</Badge>
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>
    default:
      return null
  }
}
