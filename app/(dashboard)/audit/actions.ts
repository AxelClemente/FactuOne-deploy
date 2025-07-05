"use server"

import { getCurrentUser } from "@/lib/auth"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getAuditLogs, getAuditStats } from "@/lib/audit"
import { hasPermission } from "@/lib/auth"

export async function getAuditLogsAction(filters: {
  module?: string
  action?: string
  entityId?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
} = {}) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "No has iniciado sesión" }
    }

    const businessId = await getActiveBusiness()
    if (!businessId) {
      return { success: false, error: "No hay un negocio activo" }
    }

    // Verificar permisos de administrador
    const canView = await hasPermission(user.id, businessId, "audit", "view")
    if (!canView) {
      return { success: false, error: "No tienes permisos para ver auditoría" }
    }

    const logs = await getAuditLogs(businessId, {
      ...filters,
      module: filters.module === "all" ? undefined : filters.module,
      action: filters.action === "all" ? undefined : filters.action,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    })

    return { success: true, logs }
  } catch (error) {
    console.error("Error obteniendo logs de auditoría:", error)
    return { success: false, error: "Error obteniendo logs de auditoría" }
  }
}

export async function getAuditStatsAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "No has iniciado sesión" }
    }

    const businessId = await getActiveBusiness()
    if (!businessId) {
      return { success: false, error: "No hay un negocio activo" }
    }

    // Verificar permisos de administrador
    const canView = await hasPermission(user.id, businessId, "audit", "view")
    if (!canView) {
      return { success: false, error: "No tienes permisos para ver auditoría" }
    }

    const stats = await getAuditStats(businessId)
    return { success: true, stats }
  } catch (error) {
    console.error("Error obteniendo estadísticas de auditoría:", error)
    return { success: false, error: "Error obteniendo estadísticas" }
  }
} 