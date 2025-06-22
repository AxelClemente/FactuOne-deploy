"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function AnalyticsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
  )

  const updateFilters = (newStartDate?: Date, newEndDate?: Date, period?: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (period) {
      params.set("period", period)
      params.delete("startDate")
      params.delete("endDate")
    } else {
      params.delete("period")
      if (newStartDate) {
        params.set("startDate", format(newStartDate, "yyyy-MM-dd"))
      } else {
        params.delete("startDate")
      }
      if (newEndDate) {
        params.set("endDate", format(newEndDate, "yyyy-MM-dd"))
      } else {
        params.delete("endDate")
      }
    }

    router.push(`/analytics?${params.toString()}`)
  }

  const handlePeriodChange = (period: string) => {
    const today = new Date()
    let start: Date
    const end: Date = today

    switch (period) {
      case "today":
        start = today
        break
      case "week":
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case "quarter":
        const quarter = Math.floor(today.getMonth() / 3)
        start = new Date(today.getFullYear(), quarter * 3, 1)
        break
      case "year":
        start = new Date(today.getFullYear(), 0, 1)
        break
      default:
        return
    }

    setStartDate(start)
    setEndDate(end)
    updateFilters(start, end, period)
  }

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    updateFilters(date, endDate)
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    updateFilters(startDate, date)
  }

  const clearFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    router.push("/analytics")
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      {/* Períodos predefinidos */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Período</label>
        <Select onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="quarter">Este trimestre</SelectItem>
            <SelectItem value="year">Este año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fecha de inicio */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha de inicio</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-[200px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              disabled={(date) => date > new Date()}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Fecha de fin */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha de fin</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-[200px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateChange}
              disabled={(date) => date > new Date() || (startDate && date < startDate)}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Botón limpiar */}
      <Button variant="outline" onClick={clearFilters}>
        Limpiar filtros
      </Button>
    </div>
  )
}
