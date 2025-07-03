"use server"

import { getDb, getBusinessesForUser } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// Tipos para los datos del dashboard
export type MonthlyData = {
  month: string
  income: number
  expenses: number
}

export type DashboardData = {
  monthlyData: MonthlyData[]
  totalInvoices: number
  pendingInvoices: number
  totalReceivedInvoices: number
  wonProjects: number
  lostProjects: number
  pendingProjects: number
  currentMonthIncome: number
  currentMonthExpenses: number
  yearToDateIncome: number
  yearToDateExpenses: number
}

// Función para convertir períodos predefinidos en fechas
function convertPeriodToDates(period?: string): { startDate?: Date; endDate?: Date } {
  console.log("🔄 convertPeriodToDates llamado con period:", period)
  
  if (!period) {
    console.log("📝 No hay período, retornando objeto vacío")
    return {}
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let result: { startDate?: Date; endDate?: Date } = {}
  
  switch (period) {
    case "today":
      result = { startDate: today, endDate: today }
      break
    
    case "yesterday":
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      result = { startDate: yesterday, endDate: yesterday }
      break
    
    case "thisMonth":
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      result = { startDate: firstDayOfMonth, endDate: lastDayOfMonth }
      break
    
    case "last3Months":
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      result = { startDate: threeMonthsAgo, endDate: lastDayOfCurrentMonth }
      break
    
    case "thisYear":
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
      const lastDayOfYear = new Date(now.getFullYear(), 11, 31)
      result = { startDate: firstDayOfYear, endDate: lastDayOfYear }
      break
    
    case "all":
      result = {} // Sin filtros de fecha
      break
    
    default:
      console.log("⚠️ Período no reconocido:", period)
      result = {}
  }
  
  console.log("📅 convertPeriodToDates resultado:", result)
  return result
}

// Función para obtener los datos del dashboard para un negocio específico con filtros de fecha
export async function getDashboardData(
  businessId: string, 
  startDate?: Date, 
  endDate?: Date, 
  period?: string
): Promise<DashboardData> {
  console.log("🚀 getDashboardData llamado con:", { businessId, startDate, endDate, period })

  // Convertir período en fechas si se proporciona
  const periodDates = convertPeriodToDates(period)
  const finalStartDate = startDate || periodDates.startDate
  const finalEndDate = endDate || periodDates.endDate

  console.log("📅 Fechas finales después de procesar período:", { 
    originalStartDate: startDate, 
    originalEndDate: endDate,
    periodDates,
    finalStartDate, 
    finalEndDate 
  })

  try {
    const db = await getDb();
    
    // Obtener facturas emitidas del negocio
    let invoices = await db.query.invoices.findMany({
      where: (invoices, { eq, and }) => and(eq(invoices.businessId, businessId), eq(invoices.isDeleted, false)),
    })
    console.log("📊 Facturas emitidas encontradas:", invoices.length)

    // Obtener facturas recibidas del negocio
    let receivedInvoices = await db.query.receivedInvoices.findMany({
      where: (receivedInvoices, { eq, and }) => and(eq(receivedInvoices.businessId, businessId), eq(receivedInvoices.isDeleted, false)),
    })
    console.log("📊 Facturas recibidas encontradas:", receivedInvoices.length)

    // Obtener proyectos del negocio
    let projects = await db.query.projects.findMany({
      where: (projects, { eq, and }) => and(eq(projects.businessId, businessId), eq(projects.isDeleted, false)),
    })
    console.log("📊 Proyectos encontrados:", projects.length)

    // Aplicar filtros de fecha si se proporcionan
    if (finalStartDate || finalEndDate) {
      console.log("🔍 Aplicando filtros de fecha...")

      if (finalStartDate && finalEndDate) {
        console.log("🔍 Filtrando por rango completo:", { finalStartDate, finalEndDate })
        // Filtrar por rango de fechas
        invoices = invoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= finalStartDate && invoiceDate <= finalEndDate
        })

        receivedInvoices = receivedInvoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= finalStartDate && invoiceDate <= finalEndDate
        })

        projects = projects.filter((project: any) => {
          if (!project.startDate) return false
          const projectDate = new Date(project.startDate)
          return projectDate >= finalStartDate && projectDate <= finalEndDate
        })
      } else if (finalStartDate) {
        console.log("🔍 Filtrando desde fecha:", finalStartDate)
        // Filtrar desde fecha de inicio
        invoices = invoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= finalStartDate
        })

        receivedInvoices = receivedInvoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= finalStartDate
        })

        projects = projects.filter((project: any) => {
          if (!project.startDate) return false
          const projectDate = new Date(project.startDate)
          return projectDate >= finalStartDate
        })
      } else if (finalEndDate) {
        console.log("🔍 Filtrando hasta fecha:", finalEndDate)
        // Filtrar hasta fecha de fin
        invoices = invoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate <= finalEndDate
        })

        receivedInvoices = receivedInvoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate <= finalEndDate
        })

        projects = projects.filter((project: any) => {
          if (!project.startDate) return false
          const projectDate = new Date(project.startDate)
          return projectDate <= finalEndDate
        })
      }

      console.log(
        `📊 Después del filtrado: ${invoices.length} facturas, ${receivedInvoices.length} facturas recibidas, ${projects.length} proyectos`,
      )
    } else {
      console.log("📊 No se aplicaron filtros de fecha")
    }

    // Calcular totales de facturas por estado
    const totalInvoices = invoices.length
    const paidInvoices = invoices.filter((inv: any) => inv.status === "paid")
    const pendingInvoices = invoices.filter((inv: any) => inv.status === "pending" || inv.status === "overdue").length
    console.log("Facturas pagadas:", paidInvoices)

    // Calcular totales de facturas recibidas
    const totalReceivedInvoices = receivedInvoices.length
    const recordedReceived = receivedInvoices.filter((inv: any) => inv.status === "recorded")
    console.log("Facturas recibidas contabilizadas:", recordedReceived)

    // Calcular totales de proyectos por estado
    const wonProjects = projects.filter((proj: any) => proj.status === "won").length
    const lostProjects = projects.filter((proj: any) => proj.status === "lost").length
    const pendingProjects = projects.filter((proj: any) => proj.status === "pending").length

    // Generar datos mensuales para el período filtrado o los últimos 12 meses
    const monthlyData = generateMonthlyData(invoices, receivedInvoices, finalStartDate, finalEndDate)
    console.log("monthlyData generado:", monthlyData)

    // Calcular ingresos y gastos del período
    const totalIncome = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0)
    const totalExpenses = recordedReceived.reduce((sum: number, inv: any) => sum + Number(inv.total), 0)

    // Para el mes actual, usar los datos del último mes en monthlyData
    const currentMonthData = monthlyData[monthlyData.length - 1] || { income: 0, expenses: 0 }

    const result = {
      monthlyData,
      totalInvoices,
      pendingInvoices,
      totalReceivedInvoices,
      wonProjects,
      lostProjects,
      pendingProjects,
      currentMonthIncome: currentMonthData.income,
      currentMonthExpenses: currentMonthData.expenses,
      yearToDateIncome: totalIncome,
      yearToDateExpenses: totalExpenses,
    }

    console.log("✅ getDashboardData resultado final:", {
      totalInvoices: result.totalInvoices,
      pendingInvoices: result.pendingInvoices,
      totalReceivedInvoices: result.totalReceivedInvoices,
      wonProjects: result.wonProjects,
      lostProjects: result.lostProjects,
      pendingProjects: result.pendingProjects,
      yearToDateIncome: result.yearToDateIncome,
      yearToDateExpenses: result.yearToDateExpenses,
      monthlyDataLength: result.monthlyData.length
    })

    return result
  } catch (error) {
    console.error("Error al obtener datos del dashboard:", error)
    throw new Error("No se pudieron obtener los datos del dashboard")
  }
}

// Función para generar datos mensuales con filtros de fecha opcionales
function generateMonthlyData(
  invoices: any[],
  receivedInvoices: any[],
  startDate?: Date,
  endDate?: Date,
): MonthlyData[] {
  const months: MonthlyData[] = []

  // Determinar el rango de fechas
  let rangeStart: Date
  let rangeEnd: Date

  if (startDate && endDate) {
    rangeStart = new Date(startDate)
    rangeEnd = new Date(endDate)
  } else if (startDate) {
    rangeStart = new Date(startDate)
    rangeEnd = new Date()
  } else if (endDate) {
    rangeStart = new Date(endDate)
    rangeStart.setFullYear(rangeStart.getFullYear() - 1)
    rangeEnd = new Date(endDate)
  } else {
    // Por defecto, últimos 12 meses
    rangeEnd = new Date()
    rangeStart = new Date()
    rangeStart.setFullYear(rangeStart.getFullYear() - 1)
  }

  // Generar meses en el rango
  const currentDate = new Date(rangeStart)
  currentDate.setDate(1) // Primer día del mes

  while (currentDate <= rangeEnd) {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1

    months.push({
      month: `${year}-${month.toString().padStart(2, "0")}`,
      income: 0,
      expenses: 0,
    })

    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  // Calcular ingresos por mes (facturas emitidas pagadas)
  invoices.forEach((invoice: any) => {
    if (invoice.status === "paid") {
      const invoiceDate = new Date(invoice.date)
      const monthKey = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, "0")}`

      const monthData = months.find((m) => m.month === monthKey)
      if (monthData) {
        monthData.income += Number(invoice.total)
      }
    }
  })

  // Calcular gastos por mes (facturas recibidas contabilizadas)
  receivedInvoices.forEach((invoice: any) => {
    if (invoice.status === "recorded") {
      const invoiceDate = new Date(invoice.date)
      const monthKey = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, "0")}`

      const monthData = months.find((m) => m.month === monthKey)
      if (monthData) {
        monthData.expenses += Number(invoice.total)
      }
    }
  })

  console.log("[generateMonthlyData] months result:", months)
  return months
}

// Función para obtener el negocio activo del usuario actual
export async function getActiveBusinessForCurrentUser() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new Error("Usuario no autenticado")
    }

    const businesses = await getBusinessesForUser(user.id)

    if (!businesses || businesses.length === 0) {
      throw new Error("El usuario no tiene negocios asociados")
    }

    // Por defecto, devolvemos el primer negocio como activo
    // En una implementación real, esto vendría de una preferencia del usuario
    return businesses[0]
  } catch (error) {
    console.error("Error al obtener el negocio activo:", error)
    throw new Error("No se pudo obtener el negocio activo")
  }
}
