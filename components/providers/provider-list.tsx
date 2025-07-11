"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Plus, Search, ArrowUp, ArrowDown, PlusCircle, Edit, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Provider {
  id: string
  name: string
  nif: string
  address: string
  phone: string
  email: string
  totalInvoiced?: number
  totalPending?: number
  invoiceCount?: number
}

type SortField = "name" | "totalInvoiced" | "totalPending" | "invoiceCount"
type SortOrder = "asc" | "desc"
type FilterTab = "all" | "overdue" | "top" | "noInvoices"

export default function ProviderList({ 
  providers = [], 
  businessId, 
  canCreateProvider 
}: { 
  providers: Provider[], 
  businessId: string,
  canCreateProvider: boolean 
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [activeTab, setActiveTab] = useState<FilterTab>("all")

  // Filtros y ordenación
  const filteredProviders = useMemo(() => {
    let result = [...providers]
    // Búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (provider) =>
          provider.name.toLowerCase().includes(search) ||
          provider.nif.toLowerCase().includes(search) ||
          provider.email?.toLowerCase().includes(search)
      )
    }
    // Tabs
    switch (activeTab) {
      case "overdue":
        result = result.filter((p) => (p.totalPending ?? 0) > 0)
        break
      case "top":
        result = result.filter((p) => (p.totalInvoiced ?? 0) > 0)
        result.sort((a, b) => (b.totalInvoiced ?? 0) - (a.totalInvoiced ?? 0))
        result = result.slice(0, 10)
        break
      case "noInvoices":
        result = result.filter((p) => (p.invoiceCount ?? 0) === 0)
        break
    }
    // Ordenación
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "totalInvoiced":
          comparison = (a.totalInvoiced ?? 0) - (b.totalInvoiced ?? 0)
          break
        case "totalPending":
          comparison = (a.totalPending ?? 0) - (b.totalPending ?? 0)
          break
        case "invoiceCount":
          comparison = (a.invoiceCount ?? 0) - (b.invoiceCount ?? 0)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
    return result
  }, [providers, searchTerm, activeTab, sortField, sortOrder])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
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
              <TabsTrigger value="top">Top proveedores</TabsTrigger>
              <TabsTrigger value="noInvoices">Sin facturas</TabsTrigger>
            </TabsList>
          </Tabs>
          {canCreateProvider && (
            <Button asChild>
              <Link href="/proveedores/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Proveedor
              </Link>
            </Button>
          )}
        </div>
      </div>
      {/* Ordenación */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={sortField === "name" ? "secondary" : "outline"} size="sm" onClick={() => toggleSort("name")}>Nombre {sortField === "name" ? (sortOrder === "asc" ? <ArrowUp /> : <ArrowDown />) : null}</Button>
        <Button variant={sortField === "totalInvoiced" ? "secondary" : "outline"} size="sm" onClick={() => toggleSort("totalInvoiced")}>Total facturado {sortField === "totalInvoiced" ? (sortOrder === "asc" ? <ArrowUp /> : <ArrowDown />) : null}</Button>
        <Button variant={sortField === "totalPending" ? "secondary" : "outline"} size="sm" onClick={() => toggleSort("totalPending")}>Total pendiente {sortField === "totalPending" ? (sortOrder === "asc" ? <ArrowUp /> : <ArrowDown />) : null}</Button>
        <Button variant={sortField === "invoiceCount" ? "secondary" : "outline"} size="sm" onClick={() => toggleSort("invoiceCount")}>Nº facturas {sortField === "invoiceCount" ? (sortOrder === "asc" ? <ArrowUp /> : <ArrowDown />) : null}</Button>
      </div>
      {/* Listado de proveedores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProviders.length === 0 ? (
          <div className="col-span-full text-center py-6 text-muted-foreground">
            No hay proveedores registrados.
          </div>
        ) : (
          filteredProviders.map((provider) => {
            // Determinar status
            let status: "current" | "overdue" = "current"
            if ((provider.totalPending ?? 0) > 0) status = "overdue"
            // Badge
            const badge = status === "overdue"
              ? <Badge variant="destructive">Con deuda</Badge>
              : <Badge variant="outline">Al día</Badge>
            return (
              <div key={provider.id} className="rounded-lg border bg-white p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold">{provider.name}</h2>
                  {badge}
                </div>
                <div className="text-sm text-muted-foreground">{provider.nif}</div>
                <div className="text-sm">{provider.address}</div>
                <div className="text-sm">{provider.email}</div>
                <div className="text-sm">{provider.phone}</div>
                <div className="flex-1" />
                <div className="mt-4">
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/proveedores/${provider.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/proveedores/${provider.id}`}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {provider.invoiceCount === 1
                          ? "1 factura"
                          : `${provider.invoiceCount ?? 0} facturas`}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
} 