"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface CertificateStatus {
  businessId: string
  businessName: string
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiration: number
  validUntil: Date | null
}

interface CertificateStatusCardProps {
  showActions?: boolean
  className?: string
}

export function CertificateStatusCard({ showActions = true, className }: CertificateStatusCardProps) {
  const [status, setStatus] = useState<CertificateStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/verifactu/certificate-monitor?action=status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
      } else {
        console.error('Error obteniendo estado del certificado')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkCertificate = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/verifactu/certificate-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-monitor' })
      })

      if (response.ok) {
        toast.success('Verificación de certificado completada')
        await fetchStatus()
      } else {
        toast.error('Error verificando certificado')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado del Certificado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado del Certificado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudo obtener el estado del certificado
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    if (status.isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Expirado
        </Badge>
      )
    }
    
    if (status.isExpiringSoon) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
          <AlertTriangle className="h-3 w-3" />
          Expira Pronto
        </Badge>
      )
    }
    
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Válido
      </Badge>
    )
  }

  const getStatusAlert = () => {
    if (status.isExpired) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Certificado expirado</strong><br />
            No se pueden enviar facturas a VERI*FACTU hasta que actualice el certificado.
          </AlertDescription>
        </Alert>
      )
    }
    
    if (status.isExpiringSoon) {
      const urgency = status.daysUntilExpiration <= 7 ? 'urgente' : 'importante'
      const variant = status.daysUntilExpiration <= 7 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
      const textColor = status.daysUntilExpiration <= 7 ? 'text-red-800' : 'text-orange-800'
      
      return (
        <Alert className={variant}>
          <AlertTriangle className={`h-4 w-4 ${status.daysUntilExpiration <= 7 ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription className={textColor}>
            <strong>Es {urgency} renovar el certificado</strong><br />
            Expira en {status.daysUntilExpiration} días ({status.validUntil ? new Date(status.validUntil).toLocaleDateString() : 'fecha desconocida'}).
          </AlertDescription>
        </Alert>
      )
    }
    
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estado del Certificado
        </CardTitle>
        <CardDescription>
          Certificado digital para firma VERI*FACTU
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado actual:</span>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Días restantes:</span>
            <div className="font-mono text-lg">
              {status.daysUntilExpiration >= 0 ? status.daysUntilExpiration : 'Expirado'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Válido hasta:</span>
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {status.validUntil ? new Date(status.validUntil).toLocaleDateString() : 'Desconocido'}
            </div>
          </div>
        </div>

        {getStatusAlert()}

        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={checkCertificate} 
              disabled={checking}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Verificando...' : 'Verificar Ahora'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}