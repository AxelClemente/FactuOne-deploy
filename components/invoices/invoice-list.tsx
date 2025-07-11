"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Edit, Eye, FileCheck, FileText, MoreHorizontal, Plus, Trash, PlusCircle } from "lucide-react"
import { getInvoicesForCurrentUser, updateInvoiceStatus, deleteInvoice } from "@/app/(dashboard)/invoices/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import { useToast } from "@/hooks/use-toast"

interface InvoiceListProps {
  businessId: string
  initialInvoices: any[]
  canCreateInvoice: boolean
}

export function InvoiceList({ businessId, initialInvoices, canCreateInvoice }: InvoiceListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState(initialInvoices)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"table" | "cards">("table")

  // Cargar facturas cuando cambian los filtros
  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true)
      try {
        // Extraer los valores de los parámetros de búsqueda una sola vez
        const status = searchParams.get("status") || undefined
        const clientId = searchParams.get("clientId") || undefined
        const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
        const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
        const searchTerm = searchParams.get("search") || undefined

        const data = await getInvoicesForCurrentUser({
          businessId,
          status,
          clientId,
          startDate,
          endDate,
          searchTerm,
        })

        setInvoices(data)
      } catch (error) {
        console.error("Error al cargar facturas:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las facturas",
        })
      } finally {
        setLoading(false)
      }
    }

    // Usar una variable para controlar si el efecto debe ejecutarse
    const shouldLoadInvoices = true
    if (shouldLoadInvoices) {
      loadInvoices()
    }

    // Convertir searchParams a un string para la dependencia
    const searchParamsString = searchParams.toString()

    // Dependencias estables que no cambiarán en cada renderización
  }, [businessId, searchParams.toString(), toast])

  // Cambiar estado de factura
  const handleStatusChange = async (invoiceId: string, status: "draft" | "paid" | "overdue" | "cancelled") => {
    try {
      const result = await updateInvoiceStatus(invoiceId, status)

      if (result.success) {
        toast({
          title: "Estado actualizado",
          description: "El estado de la factura ha sido actualizado correctamente",
        })

        // Actualizar la lista de facturas localmente sin provocar una recarga completa
        setInvoices((prevInvoices) =>
          prevInvoices.map((invoice) => (invoice.id === invoiceId ? { ...invoice, status } : invoice)),
        )
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
    }
  }

  // Eliminar factura
  const handleDelete = async (invoiceId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const result = await deleteInvoice(invoiceId)

      if (result.success) {
        toast({
          title: "Factura eliminada",
          description: "La factura ha sido eliminada correctamente",
        })

        // Actualizar la lista de facturas localmente sin provocar una recarga completa
        setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== invoiceId))
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "No se pudo eliminar la factura",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al eliminar la factura",
      })
    }
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

  if (loading) {
    return <div className="text-center py-8">Cargando facturas...</div>
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">No hay facturas</h2>
        <p className="mt-2 text-muted-foreground">No se encontraron facturas con los filtros seleccionados.</p>
        {canCreateInvoice && (
          <Button asChild className="mt-4">
            <Link href="/invoices/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear factura
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs a la izquierda y botón a la derecha en la misma línea */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
            className="rounded-r-none"
          >
            Tabla
          </Button>
          <Button
            variant={view === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("cards")}
            className="rounded-l-none"
          >
            Tarjetas
          </Button>
        </div>
        {canCreateInvoice && (
          <Button asChild>
            <Link href="/invoices/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear factura
            </Link>
          </Button>
        )}
      </div>

      {/* Vista de tabla */}
      {view === "table" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>{invoice.clientName || "Cliente desconocido"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{invoice.concept}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </Link>
                        </DropdownMenuItem>
                        {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${invoice.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {invoice.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, "paid")}>Marcar como pagada</DropdownMenuItem>
                        )}
                        {invoice.status !== "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, "draft")}>Marcar como pendiente</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Vista de tarjetas */}
      {view === "cards" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{invoice.number}</CardTitle>
                    <CardDescription>{formatDate(invoice.date)}</CardDescription>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                  <p>{invoice.clientName || "Cliente desconocido"}</p>
                </div>
                <div className="mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Concepto</p>
                  <p className="line-clamp-2">{invoice.concept}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{formatCurrency(invoice.total)}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/invoices/${invoice.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Link>
                </Button>
                {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/invoices/${invoice.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDelete(invoice.id)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
