"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Edit, FileCheck, FileX, Printer } from "lucide-react"
import { updateReceivedInvoiceStatus } from "@/app/(dashboard)/received-invoices/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ReceivedInvoiceStatusBadge } from "@/components/received-invoices/received-invoice-status-badge"
import { useToast } from "@/hooks/use-toast"

interface ReceivedInvoiceDetailProps {
  invoice: any
  categories: { id: string; name: string }[]
}

export function ReceivedInvoiceDetail({ invoice, categories }: ReceivedInvoiceDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Cambiar estado de factura
  const handleStatusChange = async (status: "pending" | "recorded" | "rejected") => {
    setIsLoading(true)

    try {
      const result = await updateReceivedInvoiceStatus(invoice.id, status)

      if (result.success) {
        toast({
          title: "Estado actualizado",
          description: "El estado de la factura ha sido actualizado correctamente",
        })

        // Recargar la página para mostrar el nuevo estado
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "No se pudo actualizar el estado",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al actualizar el estado",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Simular descarga de PDF
  const handleDownloadPDF = () => {
    toast({
      title: "Descarga simulada",
      description: "En una implementación real, aquí se descargaría el documento de la factura",
    })
  }

  // Simular impresión
  const handlePrint = () => {
    toast({
      title: "Impresión simulada",
      description: "En una implementación real, aquí se abriría el diálogo de impresión",
    })
  }

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES").format(date)
  }

  // Obtener nombre de la categoría
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Sin categoría"
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Sin categoría"
  }

  return (
    <div className="space-y-6">
      {/* Cabecera de factura */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold">{invoice.number || "Factura recibida"}</h1>
          <p className="text-muted-foreground">Emitida el {formatDate(invoice.date)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ReceivedInvoiceStatusBadge status={invoice.status} />

          {/* Botones de descarga */}
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/received-invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/received-invoices/${invoice.id}/xml`} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Descargar XML
            </a>
          </Button>

          {/* Botones de acción */}
          {invoice.fileUrl && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>

              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </>
          )}

          <Button variant="outline" size="sm" asChild>
            <a href={`/received-invoices/${invoice.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </a>
          </Button>

          {/* Menú de cambio de estado */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Cambiar estado"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {invoice.status !== "pending" && (
                <DropdownMenuItem onClick={() => handleStatusChange("pending")}>Marcar como pendiente</DropdownMenuItem>
              )}
              {invoice.status !== "recorded" && (
                <DropdownMenuItem onClick={() => handleStatusChange("recorded")}>
                  <FileCheck className="mr-2 h-4 w-4 text-emerald-500" />
                  Marcar como contabilizada
                </DropdownMenuItem>
              )}
              {invoice.status !== "rejected" && (
                <DropdownMenuItem onClick={() => handleStatusChange("rejected")}>
                  <FileX className="mr-2 h-4 w-4 text-destructive" />
                  Marcar como rechazada
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Información de proveedor y factura */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proveedor</CardTitle>
            <CardDescription>Información del proveedor de la factura</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Nombre</dt>
                <dd className="text-base">{invoice.providerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">NIF/CIF</dt>
                <dd className="text-base">{invoice.providerNIF}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles de factura</CardTitle>
            <CardDescription>Información general de la factura recibida</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              {invoice.number && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Número de factura</dt>
                  <dd className="text-base">{invoice.number}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Fecha de emisión</dt>
                <dd className="text-base">{formatDate(invoice.date)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Categoría</dt>
                <dd className="text-base">{getCategoryName(invoice.category)}</dd>
              </div>
              {invoice.projectId && invoice.project && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Proyecto asociado</dt>
                  <dd className="text-base">
                    <a
                      href={`/projects/${invoice.project.id}`}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {invoice.project.name}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Estado</dt>
                <dd className="text-base">
                  <ReceivedInvoiceStatusBadge status={invoice.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Importe total</dt>
                <dd className="text-xl font-bold">{formatCurrency(invoice.amount)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Documento de factura */}
      {invoice.fileUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Documento</CardTitle>
            <CardDescription>Documento adjunto de la factura recibida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
              <div className="mb-4 text-center">
                <p className="text-sm text-muted-foreground">Documento de factura disponible</p>
                <a
                  href={invoice.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-blue-500 underline"
                >
                  Ver documento original
                </a>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
