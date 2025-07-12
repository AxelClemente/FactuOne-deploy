"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, Search, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ReceivedInvoiceFiltersProps {
  categories: { id: string; name: string }[]
}

export function ReceivedInvoiceFilters({ categories }: ReceivedInvoiceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Estado para los filtros
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [category, setCategory] = useState(searchParams.get("category") || "all")
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
    { value: "pending", label: "Pendiente" },
    { value: "recorded", label: "Contabilizada" },
    { value: "rejected", label: "Rechazada" },
  ]

  // Función para actualizar los parámetros de búsqueda
  const updateSearchParams = () => {
    const current = new URLSearchParams()

    if (status && status !== "all") {
      current.set("status", status)
    }
    if (category && category !== "all") {
      current.set("category", category)
    }
    if (startDate) {
      // Usar fecha local para evitar problemas de zona horaria
      const year = startDate.getFullYear()
      const month = (startDate.getMonth() + 1).toString().padStart(2, "0")
      const day = startDate.getDate().toString().padStart(2, "0")
      current.set("startDate", `${year}-${month}-${day}`)
    }
    if (endDate) {
      const year = endDate.getFullYear()
      const month = (endDate.getMonth() + 1).toString().padStart(2, "0")
      const day = endDate.getDate().toString().padStart(2, "0")
      current.set("endDate", `${year}-${month}-${day}`)
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
  }, [status, category, startDate, endDate])

  // Manejar la búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParams()
  }

  // Limpiar todos los filtros
  const clearFilters = () => {
    setStatus("all")
    setCategory("all")
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

        {/* Filtro por categoría */}
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
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
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
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
                  setTimeout(() => setDateOpen(false), 100)
                }
              }}
              numberOfMonths={1}
              weekStartsOn={1}
              fixedWeeks
              className="rounded-md"
              classNames={{}}
              labels={{}}
              formatters={{}}
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
              placeholder="Buscar por proveedor o número..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>

      {/* Botón para limpiar filtros */}
      {(status !== "all" || category !== "all" || startDate || endDate || searchTerm) && (
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
