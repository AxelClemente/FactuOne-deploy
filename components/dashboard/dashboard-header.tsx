import Link from "next/link"
import { Building2, CalendarRange, Download, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de la situación económica de tu negocio</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm">
          <CalendarRange className="mr-2 h-4 w-4" />
          Filtrar por fecha
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/clients">
            <Users className="mr-2 h-4 w-4" />
            Clientes
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/businesses">
            <Building2 className="mr-2 h-4 w-4" />
            Mis Negocios
          </Link>
        </Button>
      </div>
    </div>
  )
}
