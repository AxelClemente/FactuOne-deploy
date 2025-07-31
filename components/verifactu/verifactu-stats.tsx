"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getVerifactuStats } from "@/app/(dashboard)/verifactu/actions"
import { Loader2, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react"

interface VerifactuStatsProps {
  businessId: string
}

export function VerifactuStats({ businessId }: VerifactuStatsProps) {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getVerifactuStats()
        setStats(data)
      } catch (error) {
        console.error("Error cargando estadísticas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [businessId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No se pudieron cargar las estadísticas</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRegistries}</div>
          <p className="text-xs text-muted-foreground">
            Facturas registradas en VERI*FACTU
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Enviados</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.sentCount}</div>
          <p className="text-xs text-muted-foreground">
            Confirmados por la AEAT
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingCount}</div>
          <p className="text-xs text-muted-foreground">
            En cola de envío
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Con Error</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.errorCount}</div>
          <p className="text-xs text-muted-foreground">
            Requieren atención
          </p>
        </CardContent>
      </Card>

      {stats.lastRegistry && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Último Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Número de secuencia:</span>
                <span className="text-sm font-medium">#{stats.lastRegistry.sequenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fecha:</span>
                <span className="text-sm font-medium">
                  {new Date(stats.lastRegistry.createdAt).toLocaleString('es-ES')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Estado:</span>
                <span className={`text-sm font-medium ${
                  stats.lastRegistry.transmissionStatus === 'sent' 
                    ? 'text-green-600' 
                    : stats.lastRegistry.transmissionStatus === 'error'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`}>
                  {stats.lastRegistry.transmissionStatus === 'sent' 
                    ? 'Enviado' 
                    : stats.lastRegistry.transmissionStatus === 'error'
                    ? 'Error'
                    : 'Pendiente'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}