"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, ChevronsUpDown, Search, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface InvoiceFiltersProps {
  clients: { id: string; name: string }[]
}

export function InvoiceFilters({ clients }: InvoiceFiltersProps) {
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

  // Estado para el popover de fechas
  const [dateOpen, setDateOpen] = useState(false)

  // Opciones de estado
  const statusOptions = [
    { value: "all", label: "Estados" },
    { value: "draft", label: "Borrador" },
    { value: "sent", label: "Enviada" },
    { value: "paid", label: "Pagada" },
    { value: "overdue", label: "Vencida" },
    { value: "cancelled", label: "Cancelada" },
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
      // Usar fecha local para evitar problemas de zona horaria
      const year = startDate.getFullYear()
      const month = (startDate.getMonth() + 1).toString().padStart(2, "0")
      const day = startDate.getDate().toString().padStart(2, "0")
      const dateStr = `${year}-${month}-${day}`
      console.log("[FILTER] StartDate to URL:", startDate, "-> string:", dateStr)
      current.set("startDate", dateStr)
    }

    if (endDate) {
      // Usar fecha local para evitar problemas de zona horaria
      const year = endDate.getFullYear()
      const month = (endDate.getMonth() + 1).toString().padStart(2, "0")
      const day = endDate.getDate().toString().padStart(2, "0")
      const dateStr = `${year}-${month}-${day}`
      console.log("[FILTER] EndDate to URL:", endDate, "-> string:", dateStr)
      current.set("endDate", dateStr)
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por cliente */}
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={startDate || new Date()}
                selected={{
                  from: startDate,
                  to: endDate,
                }}
                onSelect={(range) => {
                  console.log("[CALENDAR] Range seleccionado:", range)
                  if (range) {
                    console.log("[CALENDAR] From:", range.from)
                    console.log("[CALENDAR] To:", range.to)
                    setStartDate(range.from)
                    setEndDate(range.to)
                  }
                }}
                numberOfMonths={1}
                weekStartsOn={1}
                fixedWeeks
                className="rounded-md"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md w-8 font-normal text-xs flex items-center justify-center",
                  row: "flex w-full mt-2",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                  day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                  day_range_end: "day-range-end",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                labels={{
                  labelMonthDropdown: () => "Mes",
                  labelYearDropdown: () => "Año",
                  labelNext: () => "Siguiente mes",
                  labelPrevious: () => "Mes anterior",
                  labelDay: (day) => format(day, "d", { locale: es }),
                  labelWeekday: (day) => format(day, "EEEEE", { locale: es }),
                }}
                formatters={{
                  formatCaption: (date) => format(date, "LLLL yyyy", { locale: es }),
                  formatWeekdayName: (day) => format(day, "EEEEE", { locale: es }),
                }}
              />
            </div>
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
              placeholder="Buscar por número o cliente..."
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
