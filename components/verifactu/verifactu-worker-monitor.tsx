"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  RefreshCw, 
  Trash2, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface WorkerStats {
  pendingCount: number
  processingCount: number
  sentCount: number
  errorCount: number
  lastProcessedAt?: string
  nextProcessingEligible?: string
}

interface ProcessingResult {
  processed: number
  successful: number
  failed: number
  errors: string[]
  lastProcessedAt: string
}

export function VerifactuWorkerMonitor() {
  const [stats, setStats] = useState<WorkerStats | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null)
  const [loading, setLoading] = useState(true)

  // Cargar estadísticas del worker
  const loadStats = async () => {
    try {
      const response = await fetch('/api/verifactu/worker')
      if (!response.ok) throw new Error('Error cargando estadísticas')
      
      const data = await response.json()
      setStats(data.data)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      toast.error('Error al cargar estadísticas del worker')
    } finally {
      setLoading(false)
    }
  }

  // Ejecutar acción del worker
  const executeWorkerAction = async (action: string, config?: any) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/verifactu/worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...config })
      })

      if (!response.ok) throw new Error('Error ejecutando acción')
      
      const data = await response.json()
      setLastResult(data.data)
      
      // Mostrar resultado
      const result = data.data
      if (result.successful > 0) {
        toast.success(`Procesados ${result.successful} registros exitosamente`)
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} registros fallaron`)
      }
      
      // Recargar estadísticas
      await loadStats()
      
    } catch (error) {
      console.error('Error ejecutando acción:', error)
      toast.error('Error al ejecutar la acción del worker')
    } finally {
      setIsProcessing(false)
    }
  }

  // Procesar cola principal
  const processQueue = () => {
    executeWorkerAction('process', {
      config: {
        batchSize: 10,
        flowControlDelay: 60
      }
    })
  }

  // Procesar reintentos
  const processRetries = () => {
    executeWorkerAction('retry')
  }

  // Limpiar registros antiguos
  const cleanupOldRegistries = () => {
    executeWorkerAction('cleanup', {
      retentionDays: 365
    })
  }

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    loadStats()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calcular si puede procesar
  const canProcess = stats?.nextProcessingEligible 
    ? new Date() >= new Date(stats.nextProcessingEligible)
    : true

  // Calcular tiempo restante
  const getTimeUntilNextProcessing = () => {
    if (!stats?.nextProcessingEligible) return null
    
    const now = new Date()
    const next = new Date(stats.nextProcessingEligible)
    const diff = next.getTime() - now.getTime()
    
    if (diff <= 0) return null
    
    const seconds = Math.ceil(diff / 1000)
    return `${seconds}s`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Worker VERI*FACTU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Worker VERI*FACTU
          </CardTitle>
          <CardDescription>
            Sistema de procesamiento automático de registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Pendientes */}
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pendingCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Pendientes</div>
            </div>

            {/* Procesando */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.processingCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Procesando</div>
            </div>

            {/* Enviados */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.sentCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Enviados</div>
            </div>

            {/* Errores */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats?.errorCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Con Error</div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Control de flujo */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Control de Flujo</span>
            </div>
            
            {canProcess ? (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Listo para procesar
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600">
                <Clock className="h-3 w-3 mr-1" />
                Esperar {getTimeUntilNextProcessing()}
              </Badge>
            )}
          </div>

          {/* Información temporal */}
          {stats?.lastProcessedAt && (
            <div className="text-sm text-muted-foreground">
              Último procesamiento: {new Date(stats.lastProcessedAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles del worker */}
      <Card>
        <CardHeader>
          <CardTitle>Controles Manuales</CardTitle>
          <CardDescription>
            Ejecutar acciones del worker manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={processQueue}
              disabled={isProcessing || !canProcess}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Procesar Cola
            </Button>

            <Button
              variant="outline"
              onClick={processRetries}
              disabled={isProcessing || stats?.errorCount === 0}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar Errores
            </Button>

            <Button
              variant="outline"
              onClick={cleanupOldRegistries}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar Antiguos
            </Button>

            <Button
              variant="ghost"
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {/* Alerta de control de flujo */}
          {!canProcess && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Respetando control de flujo AEAT. Se requiere esperar al menos 60 segundos entre envíos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultado del último procesamiento */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Último Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{lastResult.processed}</div>
                <div className="text-sm text-muted-foreground">Procesados</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{lastResult.successful}</div>
                <div className="text-sm text-muted-foreground">Exitosos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">{lastResult.failed}</div>
                <div className="text-sm text-muted-foreground">Fallidos</div>
              </div>
            </div>

            {lastResult.processed > 0 && (
              <Progress 
                value={(lastResult.successful / lastResult.processed) * 100} 
                className="mb-4"
              />
            )}

            {lastResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Errores ({lastResult.errors.length})
                </h4>
                <div className="space-y-1">
                  {lastResult.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                  {lastResult.errors.length > 5 && (
                    <div className="text-sm text-muted-foreground">
                      ... y {lastResult.errors.length - 5} errores más
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground mt-4">
              Procesado: {new Date(lastResult.lastProcessedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}