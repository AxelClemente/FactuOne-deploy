"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, Edit, Eye, FileCheck, FileX, MoreHorizontal, Plus, Trash } from "lucide-react"
import {
  getReceivedInvoices,
  updateReceivedInvoiceStatus,
  deleteReceivedInvoice,
} from "@/app/(dashboard)/received-invoices/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReceivedInvoiceStatusBadge } from "@/components/received-invoices/received-invoice-status-badge"
import { useToast } from "@/hooks/use-toast"

interface ReceivedInvoiceListProps {
  businessId: string | number
  initialInvoices: any[]
  categories: { id: string; name: string }[]
}

export function ReceivedInvoiceList({ businessId, initialInvoices, categories }: ReceivedInvoiceListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState(initialInvoices)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"table" | "cards">("table")
  const [sortField, setSortField] = useState<"date" | "amount" | "providerName">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Cargar facturas cuando cambian los filtros - Versión optimizada
  useEffect(() => {
    let isMounted = true

    const loadInvoices = async () => {
      if (!isMounted) return

      setLoading(true)
      try {
        // Extraer los valores de los parámetros de búsqueda una sola vez
        const status = searchParams.get("status") || undefined
        const category = searchParams.get("category") || undefined
        const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
        const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
        const searchTerm = searchParams.get("search") || undefined

        const data = await getReceivedInvoices({
          businessId,
          status,
          category,
          startDate,
          endDate,
          searchTerm,
        })

        if (isMounted) {
          setInvoices(data)

          // Aplicar ordenación inicial a los datos cargados
          const sortedData = [...data].sort((a, b) => {
            let comparison = 0

            switch (sortField) {
              case "date":
                const dateA = a.date ? new Date(a.date).getTime() : 0
                const dateB = b.date ? new Date(b.date).getTime() : 0
                comparison = !isNaN(dateA) && !isNaN(dateB) ? dateA - dateB : 0
                break
              case "amount":
                comparison = (a.amount || 0) - (b.amount || 0)
                break
              case "providerName":
                comparison = (a.providerName || "").localeCompare(b.providerName || "")
                break
            }

            return sortOrder === "asc" ? comparison : -comparison
          })

          setInvoices(sortedData)
        }
      } catch (error) {
        console.error("Error al cargar facturas recibidas:", error)
        if (isMounted) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar las facturas recibidas",
          })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadInvoices()

    // Cleanup function para evitar actualizaciones en componentes desmontados
    return () => {
      isMounted = false
    }
  }, [businessId, searchParams.toString(), toast, sortField, sortOrder])

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Sin fecha"

    try {
      const date = new Date(dateString)

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return "Fecha inválida"
      }

      return new Intl.DateTimeFormat("es-ES").format(date)
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return "Fecha inválida"
    }
  }

  // Ordenar facturas - Versión corregida para evitar bucle infinito
  useEffect(() => {
    // Crear una copia ordenada sin modificar el estado original
    const sortedInvoices = [...invoices].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "date":
          // Manejo seguro de fechas
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0

          // Verificar si las fechas son válidas
          comparison = !isNaN(dateA) && !isNaN(dateB) ? dateA - dateB : 0
          break
        case "amount":
          comparison = (a.amount || 0) - (b.amount || 0)
          break
        case "providerName":
          comparison = (a.providerName || "").localeCompare(b.providerName || "")
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    // Comparar si el orden ha cambiado realmente antes de actualizar el estado
    const hasOrderChanged = JSON.stringify(sortedInvoices) !== JSON.stringify(invoices)

    if (hasOrderChanged) {
      setInvoices(sortedInvoices)
    }
    // Eliminar 'invoices' de las dependencias para evitar el bucle infinito
  }, [sortField, sortOrder])

  // Función para cambiar el orden
  const toggleSort = (field: "date" | "amount" | "providerName") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  // Cambiar estado de factura
  const handleStatusChange = async (invoiceId: string, status: "pending" | "recorded" | "rejected") => {
    try {
      const result = await updateReceivedInvoiceStatus(invoiceId, status)

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
      const result = await deleteReceivedInvoice(invoiceId)

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

  // Obtener nombre de la categoría
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Sin categoría"
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Sin categoría"
  }

  if (loading) {
    return <div className="text-center py-8">Cargando facturas recibidas...</div>
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <FileX className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">No hay facturas recibidas</h2>
        <p className="mt-2 text-muted-foreground">No se encontraron facturas con los filtros seleccionados.</p>
        <Button asChild className="mt-4">
          <Link href="/received-invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Registrar factura recibida
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Botones de ordenación */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("date")}
          className={sortField === "date" ? "border-primary" : ""}
        >
          Fecha
          {sortField === "date" &&
            (sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("amount")}
          className={sortField === "amount" ? "border-primary" : ""}
        >
          Importe
          {sortField === "amount" &&
            (sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("providerName")}
          className={sortField === "providerName" ? "border-primary" : ""}
        >
          Proveedor
          {sortField === "providerName" &&
            (sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
      </div>

      {/* Selector de vista */}
      <div className="flex justify-end">
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
      </div>

      {/* Vista de tabla */}
      {view === "table" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell className="font-medium">{invoice.providerName}</TableCell>
                  <TableCell>{invoice.providerNIF}</TableCell>
                  <TableCell>{getCategoryName(invoice.category)}</TableCell>
                  <TableCell>
                    <ReceivedInvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(invoice.amount)}</TableCell>
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
                          <Link href={`/received-invoices/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/received-invoices/${invoice.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        {invoice.status === "pending" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, "recorded")}>
                            <FileCheck className="mr-2 h-4 w-4 text-emerald-500" />
                            Marcar como contabilizada
                          </DropdownMenuItem>
                        )}
                        {invoice.status === "pending" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, "rejected")}>
                            <FileX className="mr-2 h-4 w-4 text-red-500" />
                            Marcar como rechazada
                          </DropdownMenuItem>
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
                    <CardTitle className="text-lg">{invoice.providerName}</CardTitle>
                    <CardDescription>{formatDate(invoice.date)}</CardDescription>
                  </div>
                  <ReceivedInvoiceStatusBadge status={invoice.status} />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">NIF</p>
                    <p>{invoice.providerNIF}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                    <p>{getCategoryName(invoice.category)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">Importe</p>
                  <p className="text-lg font-bold">{formatCurrency(invoice.amount)}</p>
                </div>
                {invoice.fileUrl && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-muted-foreground">Archivo</p>
                    <p className="text-sm text-blue-500 underline">
                      <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer">
                        Ver documento
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/received-invoices/${invoice.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/received-invoices/${invoice.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
