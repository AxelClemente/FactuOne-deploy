"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, Check, ChevronsUpDown, Search, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ProjectFiltersProps {
  clients: { id: string; name: string }[]
}

export function ProjectFilters({ clients }: ProjectFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Estado para los filtros
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [clientId, setClientId] = useState(searchParams.get("clientId") || "all")
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
  )
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")

  // Estado para los popover
  const [clientOpen, setClientOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  // Opciones de estado
  const statusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "pending", label: "Pendiente" },
    { value: "won", label: "Ganado" },
    { value: "lost", label: "Perdido" },
  ]

  // Función para actualizar los parámetros de búsqueda
  const updateSearchParams = () => {
    const current = new URLSearchParams()

    // Solo añadir parámetros que no sean valores por defecto
    if (status && status !== "all") {
      current.set("status", status)
    }

    if (clientId && clientId !== "all") {
      current.set("clientId", clientId)
    }

    if (startDate) {
      current.set("startDate", startDate.toISOString().split("T")[0])
    }

    if (endDate) {
      current.set("endDate", endDate.toISOString().split("T")[0])
    }

    if (searchTerm) {
      current.set("search", searchTerm)
    }

    const search = current.toString()
    const query = search ? `?${search}` : ""

    router.push(`${pathname}${query}`, { scroll: false })
  }

  // Actualizar los parámetros cuando cambian los filtros (excepto searchTerm)
  useEffect(() => {
    updateSearchParams()
  }, [status, clientId, startDate, endDate])

  // Manejar la búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParams()
  }

  // Limpiar todos los filtros
  const clearFilters = () => {
    setStatus("all")
    setClientId("all")
    setStartDate(undefined)
    setEndDate(undefined)
    setSearchTerm("")
    router.push(pathname)
  }

  // Formatear el rango de fechas para mostrar
  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "dd/MM/yyyy", { locale: es })} - ${format(endDate, "dd/MM/yyyy", { locale: es })}`
    }
    if (startDate) {
      return `Desde ${format(startDate, "dd/MM/yyyy", { locale: es })}`
    }
    if (endDate) {
      return `Hasta ${format(endDate, "dd/MM/yyyy", { locale: es })}`
    }
    return "Seleccionar fechas"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Filtro por estado */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between md:w-[200px]">
              {statusOptions.find((opt) => opt.value === status)?.label || "Estado"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandList>
                <CommandGroup>
                  {statusOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(value) => {
                        setStatus(value)
                        setStatusOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", status === option.value ? "opacity-100" : "opacity-0")} />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filtro por cliente */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between md:w-[250px]">
              {clientId !== "all" ? clients.find((c) => c.id === clientId)?.name || "Cliente" : "Todos los clientes"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput placeholder="Buscar cliente..." />
              <CommandList>
                <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setClientId("all")
                      setClientOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", clientId === "all" ? "opacity-100" : "opacity-0")} />
                    Todos los clientes
                  </CommandItem>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={() => {
                        setClientId(client.id)
                        setClientOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", clientId === client.id ? "opacity-100" : "opacity-0")} />
                      {client.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filtro por fecha */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between md:w-[300px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={startDate || new Date()}
              selected={{
                from: startDate,
                to: endDate,
              }}
              onSelect={(range) => {
                setStartDate(range?.from)
                setEndDate(range?.to)
                if (range?.from || range?.to) {
                  // Auto-cerrar el popover después de seleccionar fechas
                  setTimeout(() => setDateOpen(false), 100)
                }
              }}
              numberOfMonths={2}
              locale={es}
            />
            <div className="flex items-center justify-between border-t p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate(undefined)
                  setEndDate(undefined)
                  setDateOpen(false)
                }}
              >
                Limpiar
              </Button>
              <Button size="sm" onClick={() => setDateOpen(false)}>
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Búsqueda por texto */}
        <form onSubmit={handleSearch} className="flex w-full gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>

      {/* Botón para limpiar filtros */}
      {(status !== "all" || clientId !== "all" || startDate || endDate || searchTerm) && (
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
            <X className="mr-1 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
