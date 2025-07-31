"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  RotateCcw, 
  ExternalLink, 
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle
} from "lucide-react"
import { getVerifactuRegistries, retryVerifactuSubmission } from "@/app/(dashboard)/verifactu/actions"

interface VerifactuRegistryListProps {
  businessId: string
}

export function VerifactuRegistryList({ businessId }: VerifactuRegistryListProps) {
  const [registries, setRegistries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [retryingIds, setRetryingIds] = useState(new Set<string>())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    loadRegistries()
  }, [businessId, currentPage])

  async function loadRegistries() {
    try {
      const data = await getVerifactuRegistries(currentPage, 10)
      setRegistries(data.registries)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("Error cargando registros:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRetry(registryId: string) {
    setRetryingIds(prev => new Set(prev).add(registryId))
    
    try {
      const result = await retryVerifactuSubmission(registryId)
      
      if (result.success) {
        toast({
          title: "Reintento programado",
          description: "El registro se ha marcado para reintento",
        })
        await loadRegistries()
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo programar el reintento",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al programar el reintento",
        variant: "destructive",
      })
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(registryId)
        return newSet
      })
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'sending':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'sending':
        return 'Enviando'
      case 'sent':
        return 'Enviado'
      case 'error':
        return 'Error'
      case 'rejected':
        return 'Rechazado'
      default:
        return status
    }
  }

  function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case 'sent':
        return 'default'
      case 'error':
      case 'rejected':
        return 'destructive'
      case 'sending':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (registries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay registros VERI*FACTU</p>
        <p className="text-sm text-muted-foreground mt-2">
          Los registros aparecerán aquí cuando emitas facturas con VERI*FACTU activado
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Seq.</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Factura</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registries.map((registry) => (
            <TableRow key={registry.id}>
              <TableCell>
                <span className="font-mono text-sm">#{registry.sequenceNumber}</span>
              </TableCell>
              <TableCell>
                <Badge variant={registry.invoiceType === 'sent' ? 'default' : 'secondary'}>
                  {registry.invoiceType === 'sent' ? 'Emitida' : 'Recibida'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{registry.invoiceId}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(registry.transmissionStatus)}
                  <Badge variant={getStatusVariant(registry.transmissionStatus)}>
                    {getStatusText(registry.transmissionStatus)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{new Date(registry.createdAt).toLocaleDateString('es-ES')}</div>
                  <div className="text-muted-foreground">
                    {new Date(registry.createdAt).toLocaleTimeString('es-ES')}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {registry.transmissionStatus === 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(registry.id)}
                      disabled={retryingIds.has(registry.id)}
                    >
                      {retryingIds.has(registry.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {registry.qrUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(registry.qrUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}