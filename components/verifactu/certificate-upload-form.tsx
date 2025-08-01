"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileKey, Upload, Info, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export function CertificateUploadForm({ businessId }: { businessId: string }) {
  const [certificate, setCertificate] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar extensión
      if (!file.name.match(/\.(p12|pfx)$/i)) {
        toast.error('Solo se aceptan archivos .p12 o .pfx')
        return
      }
      
      setCertificate(file)
      setUploaded(false)
    }
  }

  const handleSavePassword = async () => {
    if (!password.trim()) {
      toast.error('Ingrese una contraseña')
      return
    }

    setUploading(true)
    try {
      const response = await fetch('/api/verifactu/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Contraseña guardada correctamente')
        setPasswordSaved(true)
      } else {
        toast.error(result.error || 'Error guardando contraseña')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = async () => {
    if (!certificate) {
      toast.error('Seleccione un certificado')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('certificate', certificate)
      formData.append('password', password)

      const response = await fetch('/api/verifactu/upload-certificate', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Certificado cargado correctamente')
        setUploaded(true)
      } else {
        toast.error(result.error || 'Error cargando certificado')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileKey className="h-5 w-5" />
          Certificado Digital
        </CardTitle>
        <CardDescription>
          Suba su certificado digital FNMT para VERI*FACTU
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Solo necesario para producción.</strong> Para testing es opcional.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Upload de archivo con drag & drop */}
          <div>
            <Label htmlFor="certificate" className="text-sm font-medium">
              Certificado Digital
            </Label>
            <div
              className={`
                mt-2 relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${certificate 
                  ? 'border-green-300 bg-green-50' 
                  : isDragging
                    ? 'border-blue-500 bg-blue-100 scale-105 shadow-lg'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }
                ${isDragging ? 'animate-pulse' : ''}
              `}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDragging(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const files = e.dataTransfer.files
                if (files[0]) {
                  if (!files[0].name.match(/\.(p12|pfx)$/i)) {
                    toast.error('Solo se aceptan archivos .p12 o .pfx')
                    return
                  }
                  setCertificate(files[0])
                  setUploaded(false)
                }
              }}
              onClick={() => document.getElementById('certificate-input')?.click()}
            >
              <input
                id="certificate-input"
                type="file"
                accept=".p12,.pfx"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {certificate ? (
                <div className="space-y-3">
                  {/* Ícono de archivo con certificado */}
                  <div className="mx-auto w-16 h-20 relative">
                    <div className="w-full h-full bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden">
                      {/* Esquina doblada */}
                      <div className="absolute top-0 right-0 w-4 h-4 bg-gray-100 transform rotate-45 translate-x-2 -translate-y-2"></div>
                      
                      {/* Ícono de certificado/llave */}
                      <div className="flex-1 flex items-center justify-center">
                        <FileKey className="h-6 w-6 text-blue-600" />
                      </div>
                      
                      {/* Etiqueta de extensión */}
                      <div className="bg-gray-100 text-xs font-bold text-gray-600 py-1 text-center">
                        {certificate.name.split('.').pop()?.toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Ícono de éxito */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">{certificate.name}</p>
                    <p className="text-sm text-gray-500">
                      {(certificate.size / 1024).toFixed(1)} KB • Certificado seleccionado
                    </p>
                  </div>
                  
                  <p className="text-xs text-green-600">
                    ✓ Archivo válido. Ingrese la contraseña y haga clic en "Cargar Certificado"
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Ícono de upload */}
                  <div className="mx-auto w-16 h-20 relative">
                    <div className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                      {/* Esquina doblada */}
                      <div className="absolute top-0 right-0 w-4 h-4 bg-gray-100 transform rotate-45 translate-x-2 -translate-y-2"></div>
                      
                      {/* Ícono de subida */}
                      <div className="flex-1 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-gray-400" />
                      </div>
                      
                      {/* Etiqueta de formato */}
                      <div className="bg-gray-50 text-xs font-bold text-gray-500 py-1 text-center">
                        P12
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">
                      {isDragging ? '¡Suelta tu certificado aquí!' : 'Arrastra tu certificado aquí'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isDragging ? 'Suelta el archivo para cargarlo' : (
                        <>o <span className="text-blue-600 font-medium">haz clic para seleccionar</span></>
                      )}
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    Formatos soportados: .p12, .pfx (máx. 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <Label htmlFor="password">Contraseña del certificado</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordSaved(false) // Reset cuando cambia la contraseña
                }}
                placeholder="Contraseña del certificado (opcional)"
                className="flex-1"
              />
              <Button
                onClick={handleSavePassword}
                disabled={uploading || !password.trim()}
                variant={passwordSaved ? "default" : "outline"}
                size="default"
                className={passwordSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {passwordSaved ? (
                  <>
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Guardada
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Puede actualizar la contraseña independientemente del certificado
            </p>
          </div>

          {/* Botón de carga */}
          <Button 
            onClick={handleUpload}
            disabled={!certificate || uploading}
            className={`w-full transition-all ${
              uploaded 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : certificate 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            size="lg"
          >
            {uploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Subiendo certificado...
              </div>
            ) : uploaded ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                ✓ Certificado Cargado Exitosamente
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Cargar Certificado
              </>
            )}
          </Button>
        </div>

        {/* Estado de carga exitosa */}
        {uploaded && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900">¡Certificado configurado!</h4>
                <p className="text-sm text-green-700">
                  Su certificado digital está listo para firmar facturas en VERI*FACTU.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información legal */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="text-sm space-y-1">
              <p><strong>Requisitos:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Certificado de persona jurídica (empresa)</li>
                <li>Emitido por FNMT-RCM</li>
                <li>Del representante legal</li>
                <li>Formato .p12 o .pfx</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}