"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function DashboardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [exactDate, setExactDate] = useState<string>("")
  const [dateMode, setDateMode] = useState<"range" | "exact">("range")

  console.log("🔄 DashboardFilters renderizado - Estado actual:", {
    startDate,
    endDate,
    exactDate,
    dateMode,
  })

  // Cargar fechas desde URL al montar el componente
  useEffect(() => {
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const exactDateParam = searchParams.get("exactDate")

    console.log("🔗 Parámetros de URL:", { startDateParam, endDateParam, exactDateParam })

    if (exactDateParam) {
      setExactDate(exactDateParam)
      setDateMode("exact")
    } else if (startDateParam || endDateParam) {
      if (startDateParam) setStartDate(startDateParam)
      if (endDateParam) setEndDate(endDateParam)
      setDateMode("range")
    }
  }, [searchParams])

  const updateFilters = (newStartDate?: string, newEndDate?: string, newExactDate?: string, period?: string) => {
    console.log("🔄 Actualizando filtros:", { newStartDate, newEndDate, newExactDate, period })

    const params = new URLSearchParams(searchParams.toString())

    // Limpiar parámetros existentes
    params.delete("startDate")
    params.delete("endDate")
    params.delete("exactDate")
    params.delete("period")

    if (period) {
      params.set("period", period)
    } else if (newExactDate) {
      params.set("exactDate", newExactDate)
    } else {
      if (newStartDate) {
        params.set("startDate", newStartDate)
      }
      if (newEndDate) {
        params.set("endDate", newEndDate)
      }
    }

    router.push(`/dashboard?${params.toString()}`, { scroll: false })
  }

  const formatDateToString = (date: Date): string => {
    return date.toISOString().split("T")[0]
  }

  const handlePredefinedFilter = (period: string) => {
    console.log("🔄 Filtro predefinido seleccionado:", period)
    const now = new Date()
    let start = ""
    let end = ""

    switch (period) {
      case "today":
        const today = formatDateToString(now)
        setExactDate(today)
        setDateMode("exact")
        updateFilters(undefined, undefined, today, period)
        return
      case "yesterday":
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = formatDateToString(yesterday)
        setExactDate(yesterdayStr)
        setDateMode("exact")
        updateFilters(undefined, undefined, yesterdayStr, period)
        return
      case "thisMonth":
        start = formatDateToString(new Date(now.getFullYear(), now.getMonth(), 1))
        end = formatDateToString(new Date(now.getFullYear(), now.getMonth() + 1, 0))
        setDateMode("range")
        break
      case "last3Months":
        start = formatDateToString(new Date(now.getFullYear(), now.getMonth() - 2, 1))
        end = formatDateToString(new Date(now.getFullYear(), now.getMonth() + 1, 0))
        setDateMode("range")
        break
      case "thisYear":
        start = formatDateToString(new Date(now.getFullYear(), 0, 1))
        end = formatDateToString(new Date(now.getFullYear(), 11, 31))
        setDateMode("range")
        break
      case "all":
        start = ""
        end = ""
        setDateMode("range")
        break
    }

    setStartDate(start)
    setEndDate(end)
    setExactDate("")
    updateFilters(start || undefined, end || undefined, undefined, period)
  }

  const handleStartDateChange = (value: string) => {
    console.log("📅 Fecha de inicio seleccionada:", value)
    setStartDate(value)
    setExactDate("")
    updateFilters(value || undefined, endDate || undefined)
  }

  const handleEndDateChange = (value: string) => {
    console.log("📅 Fecha de fin seleccionada:", value)
    setEndDate(value)
    setExactDate("")
    updateFilters(startDate || undefined, value || undefined)
  }

  const handleExactDateChange = (value: string) => {
    console.log("📅 Fecha exacta seleccionada:", value)
    setExactDate(value)
    setStartDate("")
    setEndDate("")
    updateFilters(undefined, undefined, value || undefined)
  }

  const handleDateModeChange = (mode: "range" | "exact") => {
    console.log("🔄 Modo de fecha cambiado a:", mode)
    setDateMode(mode)
    if (mode === "exact") {
      setStartDate("")
      setEndDate("")
    } else {
      setExactDate("")
    }
  }

  const clearFilters = () => {
    console.log("🧹 Limpiando filtros")
    setStartDate("")
    setEndDate("")
    setExactDate("")
    router.push("/dashboard", { scroll: false })
  }

  const activePeriod = searchParams.get("period")

  // Función para formatear fecha para mostrar
  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString + "T00:00:00")
      return format(date, "dd/MM/yyyy", { locale: es })
    } catch {
      return dateString
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtros de Fecha</h3>
        {(startDate || endDate || exactDate || activePeriod) && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Filtros predefinidos */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activePeriod === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePredefinedFilter("today")}
        >
          Hoy
        </Button>
        <Button
          variant={activePeriod === "yesterday" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePredefinedFilter("yesterday")}
        >
          Ayer
        </Button>
        <Button
          variant={activePeriod === "thisMonth" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePredefinedFilter("thisMonth")}
        >
          Este mes
        </Button>
        <Button
          variant={activePeriod === "last3Months" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePredefinedFilter("last3Months")}
        >
          Últimos 3 meses
        </Button>
        <Button
          variant={activePeriod === "thisYear" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePredefinedFilter("thisYear")}
        >
          Este año
        </Button>
        <Button
          variant={activePeriod === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePredefinedFilter("all")}
        >
          Todo
        </Button>
      </div>

      {/* Selector de fechas personalizado */}
      <Tabs value={dateMode} onValueChange={(value) => handleDateModeChange(value as "range" | "exact")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="range">Rango de fechas</TabsTrigger>
          <TabsTrigger value="exact">Fecha exacta</TabsTrigger>
        </TabsList>

        <TabsContent value="range" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Fecha de inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                max={endDate || formatDateToString(new Date())}
                className="w-full"
              />
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Fecha de fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={startDate}
                max={formatDateToString(new Date())}
                className="w-full"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exact" className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Seleccionar fecha específica</label>
            <Input
              type="date"
              value={exactDate}
              onChange={(e) => handleExactDateChange(e.target.value)}
              max={formatDateToString(new Date())}
              className="w-full"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Mostrar información del filtro activo */}
      {exactDate && !activePeriod && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <span className="font-medium">Fecha exacta:</span> {formatDisplayDate(exactDate)}
        </div>
      )}

      {(startDate || endDate) && !activePeriod && !exactDate && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <span className="font-medium">Período seleccionado:</span>{" "}
          {startDate ? formatDisplayDate(startDate) : "Inicio"} - {endDate ? formatDisplayDate(endDate) : "Fin"}
        </div>
      )}

      {activePeriod && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <span className="font-medium">Filtro activo:</span> {activePeriod === "today" && "Hoy"}
          {activePeriod === "yesterday" && "Ayer"}
          {activePeriod === "thisMonth" && "Este mes"}
          {activePeriod === "last3Months" && "Últimos 3 meses"}
          {activePeriod === "thisYear" && "Este año"}
          {activePeriod === "all" && "Todos los datos"}
        </div>
      )}
    </div>
  )
}
