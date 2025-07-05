"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"

interface AuditFiltersProps {
  onFiltersChange?: (filters: any) => void
}

export function AuditFilters({ onFiltersChange }: AuditFiltersProps) {
  const [filters, setFilters] = useState({
    module: "all",
    action: "all",
    entityId: "",
    userId: "",
    startDate: "",
    endDate: "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      module: "all",
      action: "all",
      entityId: "",
      userId: "",
      startDate: "",
      endDate: "",
    }
    setFilters(clearedFilters)
    onFiltersChange?.(clearedFilters)
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== "" && value !== "all")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Auditoría
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="module">Módulo</Label>
            <Select value={filters.module} onValueChange={(value) => handleFilterChange("module", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los módulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los módulos</SelectItem>
                <SelectItem value="invoices">Facturas Emitidas</SelectItem>
                <SelectItem value="received_invoices">Facturas Recibidas</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
                <SelectItem value="providers">Proveedores</SelectItem>
                <SelectItem value="projects">Proyectos</SelectItem>
                <SelectItem value="users">Usuarios</SelectItem>
                <SelectItem value="auth">Autenticación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action">Acción</Label>
            <Select value={filters.action} onValueChange={(value) => handleFilterChange("action", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="create">Crear</SelectItem>
                <SelectItem value="update">Actualizar</SelectItem>
                <SelectItem value="delete">Eliminar</SelectItem>
                <SelectItem value="download">Descargar</SelectItem>
                <SelectItem value="view">Ver</SelectItem>
                <SelectItem value="login">Iniciar sesión</SelectItem>
                <SelectItem value="logout">Cerrar sesión</SelectItem>
                <SelectItem value="status_change">Cambio de estado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entityId">ID de Entidad</Label>
            <Input
              id="entityId"
              placeholder="Buscar por ID específico"
              value={filters.entityId}
              onChange={(e) => handleFilterChange("entityId", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">ID de Usuario</Label>
            <Input
              id="userId"
              placeholder="Buscar por usuario específico"
              value={filters.userId}
              onChange={(e) => handleFilterChange("userId", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha Inicio</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha Fin</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} size="sm">
              <X className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>
          )}
          <Button size="sm">
            <Search className="h-4 w-4 mr-2" />
            Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 