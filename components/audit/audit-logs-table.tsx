import { getAuditLogsAction } from "@/app/(dashboard)/audit/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity, Download, Eye, FileText, Users, AlertCircle } from "lucide-react"

export async function AuditLogsTable() {
  const result = await getAuditLogsAction()
  
  if (!result.success) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No se pudieron cargar los logs de auditoría</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { logs } = result

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No hay eventos de auditoría registrados</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-600" />
      case 'update':
        return <Activity className="h-4 w-4 text-blue-600" />
      case 'delete':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'download':
        return <Download className="h-4 w-4 text-purple-600" />
      case 'view':
        return <Eye className="h-4 w-4 text-gray-600" />
      case 'login':
      case 'logout':
        return <Users className="h-4 w-4 text-orange-600" />
      case 'status_change':
        return <Activity className="h-4 w-4 text-yellow-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      create: "default",
      update: "secondary",
      delete: "destructive",
      download: "outline",
      view: "secondary",
      login: "default",
      logout: "outline",
      status_change: "secondary",
    }

    return (
      <Badge variant={variants[action] || "secondary"} className="text-xs">
        {getActionIcon(action)}
        <span className="ml-1">{action}</span>
      </Badge>
    )
  }

  const getModuleName = (module: string) => {
    const names: Record<string, string> = {
      invoices: 'Facturas Emitidas',
      received_invoices: 'Facturas Recibidas',
      clients: 'Clientes',
      providers: 'Proveedores',
      projects: 'Proyectos',
      users: 'Usuarios',
      auth: 'Autenticación',
      businesses: 'Negocios',
      system: 'Sistema',
    }
    return names[module] || module
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDetails = (details: string | null) => {
    if (!details) return '-'
    
    try {
      const parsed = JSON.parse(details)
      const items = Object.entries(parsed).map(([key, value]) => `${key}: ${value}`)
      return items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '')
    } catch {
      return details.length > 50 ? details.substring(0, 50) + '...' : details
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Registro de Eventos ({logs.length} eventos)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalles</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.userId ? log.userId.substring(0, 8) + '...' : 'Sistema'}
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getModuleName(log.module)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.entityId ? log.entityId.substring(0, 8) + '...' : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {formatDetails(log.details)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.ipAddress || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 