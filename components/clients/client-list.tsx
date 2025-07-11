"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowDown, ArrowUp, Building2, CreditCard, Edit, Search, User, PlusCircle } from "lucide-react"
import { getClientsWithStats, getClientInvoices } from "@/app/(dashboard)/clients/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientInvoiceList } from "@/components/clients/client-invoice-list"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser, hasPermission } from "@/lib/auth"

type ClientWithStats = {
  id: string
  name: string
  nif: string
  address: string
  email: string
  phone: string
  totalInvoiced: number
  totalPending: number
  invoiceCount: number
  status: "current" | "overdue"
  totalInvoicedBase: number
  totalPendingBase: number
  totalInvoicedIVA: number
  totalPendingIVA: number
}

type SortField = "name" | "totalInvoiced" | "totalPending" | "invoiceCount"
type SortOrder = "asc" | "desc"
type FilterTab = "all" | "overdue" | "top" | "noInvoices"

export function ClientList({ businessId, canCreateClient = false, initialClients }: { businessId: string, canCreateClient?: boolean, initialClients?: ClientWithStats[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientInvoices, setClientInvoices] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  // Cargar clientes al iniciar
  useEffect(() => {
    async function loadClients() {
      try {
        let clientsData: ClientWithStats[] = [];
        if (initialClients) {
          clientsData = initialClients;
        } else {
          clientsData = await getClientsWithStats(businessId);
        }
        const clientsDataWithStringId = clientsData.map(client => ({
          ...client,
          id: client.id.toString()
        }))
        setClients(clientsDataWithStringId)
        setFilteredClients(clientsDataWithStringId)
      } catch (error) {
        console.error("Error al cargar clientes:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los clientes",
        })
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [businessId, toast, initialClients])

  // Filtrar clientes cuando cambia la búsqueda o la pestaña activa
  useEffect(() => {
    if (!clients.length) return

    let result = [...clients]

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(search) ||
          client.nif.toLowerCase().includes(search) ||
          client.email.toLowerCase().includes(search),
      )
    }

    // Aplicar filtro de pestaña
    switch (activeTab) {
      case "overdue":
        result = result.filter((client) => client.totalPending > 0)
        break
      case "top":
        result = result.filter((client) => client.totalInvoiced > 0)
        result.sort((a, b) => b.totalInvoiced - a.totalInvoiced)
        result = result.slice(0, 10) // Top 10
        break
      case "noInvoices":
        result = result.filter((client) => client.invoiceCount === 0)
        break
    }

    // Aplicar ordenación
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "totalInvoiced":
          comparison = a.totalInvoiced - b.totalInvoiced
          break
        case "totalPending":
          comparison = a.totalPending - b.totalPending
          break
        case "invoiceCount":
          comparison = a.invoiceCount - b.invoiceCount
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    setFilteredClients(result)
  }, [clients, searchTerm, activeTab, sortField, sortOrder])

  // Cargar facturas del cliente seleccionado
  useEffect(() => {
    async function loadClientInvoices() {
      if (!selectedClientId) {
        setClientInvoices([])
        return
      }

      setLoadingInvoices(true)

      try {
        const invoices = await getClientInvoices(selectedClientId)
        setClientInvoices(invoices)
      } catch (error) {
        console.error("Error al cargar facturas del cliente:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las facturas del cliente",
        })
      } finally {
        setLoadingInvoices(false)
      }
    }

    loadClientInvoices()
  }, [selectedClientId, toast])

  // Función para cambiar el orden
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  if (loading) {
    return <div className="text-center py-12">Cargando clientes...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filtros, búsqueda y botón de nuevo cliente */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, NIF o email..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="overdue">Con deuda</TabsTrigger>
              <TabsTrigger value="top">Top clientes</TabsTrigger>
              <TabsTrigger value="noInvoices">Sin facturas</TabsTrigger>
            </TabsList>
          </Tabs>
          {canCreateClient && (
            <Button asChild>
              <a href="/clients/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Botones de ordenación */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("name")}
          className={sortField === "name" ? "border-primary" : ""}
        >
          Nombre
          {sortField === "name" &&
            (sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("totalInvoiced")}
          className={sortField === "totalInvoiced" ? "border-primary" : ""}
        >
          Total facturado
          {sortField === "totalInvoiced" &&
            (sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("totalPending")}
          className={sortField === "totalPending" ? "border-primary" : ""}
        >
          Total pendiente
          {sortField === "totalPending" &&
            (sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("invoiceCount")}
          className={sortField === "invoiceCount" ? "border-primary" : ""}
        >
          Nº facturas
          {sortField === "invoiceCount" &&
            (sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
      </div>

      {/* Lista de clientes */}
      {filteredClients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">No se encontraron clientes</h2>
          <p className="mb-4 text-muted-foreground">
            {searchTerm
              ? "No hay clientes que coincidan con tu búsqueda."
              : activeTab !== "all"
                ? "No hay clientes que cumplan con el filtro seleccionado."
                : "Aún no has registrado ningún cliente."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedClientId === client.id ? "border-2 border-primary" : ""
              }`}
              onClick={() => setSelectedClientId(client.id === selectedClientId ? null : client.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{client.name}</CardTitle>
                  <Badge variant={client.status === "current" ? "outline" : "destructive"}>
                    {client.status === "current" ? "Al día" : "Con deuda"}
                  </Badge>
                </div>
                <CardDescription>{client.nif}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total facturado</p>
                    <p className="font-medium">
                      {formatCurrency(client.totalInvoicedBase)} <span className="text-xs text-muted-foreground">(base)</span>
                      <br />
                      {formatCurrency(client.totalInvoicedIVA)} <span className="text-xs text-muted-foreground">(IVA)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
                    <p className={`font-medium ${client.totalPendingBase > 0 ? "text-destructive" : ""}`}>
                      {formatCurrency(client.totalPendingBase)} <span className="text-xs text-muted-foreground">(base)</span>
                      <br />
                      {formatCurrency(client.totalPendingIVA)} <span className="text-xs text-muted-foreground">(IVA)</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground line-clamp-1">{client.address}</p>
                </div>
                {client.email && (
                  <div className="mt-2 flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={`/clients/${client.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {client.invoiceCount} facturas
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Panel de facturas del cliente seleccionado */}
      {selectedClientId && (
        <div className="mt-8 rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Facturas de {clients.find((c) => c.id === selectedClientId)?.name || "Cliente seleccionado"}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setSelectedClientId(null)}>
              Cerrar
            </Button>
          </div>

          {loadingInvoices ? (
            <div className="text-center py-4">Cargando facturas...</div>
          ) : clientInvoices.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-muted-foreground">Este cliente no tiene facturas registradas</p>
            </div>
          ) : (
            <ClientInvoiceList invoices={clientInvoices} />
          )}
        </div>
      )}
    </div>
  )
}
