"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Edit, FileCheck, FileX, Printer } from "lucide-react"
import { updateInvoiceStatus } from "@/app/(dashboard)/invoices/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import { useToast } from "@/hooks/use-toast"

interface InvoiceDetailProps {
  invoice: any
  client: any
  lines: any[]
}

export function InvoiceDetail({ invoice, client, lines }: InvoiceDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // DEBUG: Mostrar el proyecto asociado en consola
  console.log('[InvoiceDetail] invoice.project:', invoice.project)

  // Cambiar estado de factura
  const handleStatusChange = async (status: "draft" | "paid" | "overdue" | "cancelled") => {
    setIsLoading(true)

    try {
      const result = await updateInvoiceStatus(invoice.id, status)

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
      description: "En una implementación real, aquí se generaría y descargaría el PDF de la factura",
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

  // Calcular subtotal y total de impuestos
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const taxTotal = lines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unitPrice
    return sum + lineSubtotal * (line.taxRate / 100)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Cabecera de factura */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold">{invoice.number}</h1>
          <p className="text-muted-foreground">
            Emitida el {formatDate(invoice.date)}
            {invoice.dueDate && ` · Vence el ${formatDate(invoice.dueDate)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />

          {/* Botones de descarga */}
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/invoices/${invoice.id}/xml`} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Descargar XML
            </a>
          </Button>

          {/* Botones de acción */}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>

          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/invoices/${invoice.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </a>
            </Button>
          )}

          {/* Menú de cambio de estado */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Cambiar estado"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {invoice.status !== "draft" && (
                <DropdownMenuItem onClick={() => handleStatusChange("draft")}>Marcar como pendiente</DropdownMenuItem>
              )}
              {invoice.status !== "paid" && (
                <DropdownMenuItem onClick={() => handleStatusChange("paid")}>Marcar como pagada</DropdownMenuItem>
              )}
              {invoice.status !== "overdue" && (
                <DropdownMenuItem onClick={() => handleStatusChange("overdue")}>Marcar como vencida</DropdownMenuItem>
              )}
              {invoice.status !== "cancelled" && (
                <DropdownMenuItem onClick={() => handleStatusChange("cancelled")}>Marcar como cancelada</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Información de cliente y factura */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
            <CardDescription>Información del cliente facturado</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Nombre</dt>
                <dd className="text-base">{client.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">NIF/CIF</dt>
                <dd className="text-base">{client.nif}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Dirección</dt>
                <dd className="text-base">{client.address}</dd>
              </div>
              {client.email && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-base">{client.email}</dd>
                </div>
              )}
              {client.phone && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Teléfono</dt>
                  <dd className="text-base">{client.phone}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles de factura</CardTitle>
            <CardDescription>Información general de la factura</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Número de factura</dt>
                <dd className="text-base">{invoice.number}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Fecha de emisión</dt>
                <dd className="text-base">{formatDate(invoice.date)}</dd>
              </div>
              {invoice.dueDate && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Fecha de vencimiento</dt>
                  <dd className="text-base">{formatDate(invoice.dueDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Concepto</dt>
                <dd className="text-base">{invoice.concept}</dd>
              </div>
              {invoice.project && (
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
                  <InvoiceStatusBadge status={invoice.status} />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Líneas de factura */}
      <Card>
        <CardHeader>
          <CardTitle>Líneas de factura</CardTitle>
          <CardDescription>Detalle de productos y servicios facturados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unitario</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const lineSubtotal = line.quantity * line.unitPrice
                const lineTax = lineSubtotal * (line.taxRate / 100)
                const lineTotal = lineSubtotal + lineTax

                return (
                  <TableRow key={line.id}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                    <TableCell className="text-right">{line.taxRate}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(lineTotal)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex-col items-end">
          <div className="w-[250px] space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA:</span>
              <span>{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
