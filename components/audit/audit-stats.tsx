import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuditStatsAction } from "@/app/(dashboard)/audit/actions"
import { Activity, Download, Eye, FileText, Users } from "lucide-react"

export async function AuditStats() {
  const result = await getAuditStatsAction()
  
  if (!result.success) {
    return (
      <div className="text-center text-muted-foreground">
        No se pudieron cargar las estadísticas de auditoría
      </div>
    )
  }

  const { stats } = result

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileText className="h-4 w-4" />
      case 'update':
        return <Activity className="h-4 w-4" />
      case 'download':
        return <Download className="h-4 w-4" />
      case 'view':
        return <Eye className="h-4 w-4" />
      case 'login':
      case 'logout':
        return <Users className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getModuleName = (module: string) => {
    switch (module) {
      case 'invoices':
        return 'Facturas Emitidas'
      case 'received_invoices':
        return 'Facturas Recibidas'
      case 'clients':
        return 'Clientes'
      case 'providers':
        return 'Proveedores'
      case 'projects':
        return 'Proyectos'
      case 'users':
        return 'Usuarios'
      case 'auth':
        return 'Autenticación'
      default:
        return module
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Registros totales en el sistema
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eventos Hoy</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.todayLogs.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Actividad del día de hoy
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Acción Más Frecuente</CardTitle>
          {stats.topActions[0] && getActionIcon(stats.topActions[0].action)}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.topActions[0]?.count || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats.topActions[0]?.action || 'N/A'} ({stats.topActions[0]?.count || 0} veces)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Módulo Más Activo</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.topModules[0]?.count || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats.topModules[0] ? getModuleName(stats.topModules[0].module) : 'N/A'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 