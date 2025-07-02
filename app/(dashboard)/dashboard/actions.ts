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

// Función para obtener los datos del dashboard para un negocio específico con filtros de fecha
export async function getDashboardData(businessId: string, startDate?: Date, endDate?: Date): Promise<DashboardData> {
  console.log("Obteniendo datos del dashboard para el negocio:", businessId)
  console.log("Filtros de fecha:", { startDate, endDate })

  try {
    const db = await getDb();
    
    // Obtener facturas emitidas del negocio
    let invoices = await db.query.invoices.findMany({
      where: (invoices, { eq, and }) => and(eq(invoices.businessId, businessId), eq(invoices.isDeleted, false)),
    })
    console.log("Facturas emitidas encontradas:", invoices)

    // Obtener facturas recibidas del negocio
    let receivedInvoices = await db.query.receivedInvoices.findMany({
      where: (receivedInvoices, { eq, and }) => and(eq(receivedInvoices.businessId, businessId), eq(receivedInvoices.isDeleted, false)),
    })
    console.log("Facturas recibidas encontradas:", receivedInvoices)

    // Obtener proyectos del negocio
    let projects = await db.query.projects.findMany({
      where: (projects, { eq, and }) => and(eq(projects.businessId, businessId), eq(projects.isDeleted, false)),
    })
    console.log("Proyectos encontrados:", projects)

    // Aplicar filtros de fecha si se proporcionan
    if (startDate || endDate) {
      console.log("Aplicando filtros de fecha...")

      if (startDate && endDate) {
        // Filtrar por rango de fechas
        invoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= startDate && invoiceDate <= endDate
        })

        receivedInvoices = receivedInvoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= startDate && invoiceDate <= endDate
        })

        projects = projects.filter((project) => {
          if (!project.startDate) return false
          const projectDate = new Date(project.startDate)
          return projectDate >= startDate && projectDate <= endDate
        })
      } else if (startDate) {
        // Filtrar desde fecha de inicio
        invoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= startDate
        })

        receivedInvoices = receivedInvoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate >= startDate
        })

        projects = projects.filter((project) => {
          if (!project.startDate) return false
          const projectDate = new Date(project.startDate)
          return projectDate >= startDate
        })
      } else if (endDate) {
        // Filtrar hasta fecha de fin
        invoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate <= endDate
        })

        receivedInvoices = receivedInvoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date)
          return invoiceDate <= endDate
        })

        projects = projects.filter((project) => {
          if (!project.startDate) return false
          const projectDate = new Date(project.startDate)
          return projectDate <= endDate
        })
      }

      console.log(
        `Después del filtrado: ${invoices.length} facturas, ${receivedInvoices.length} facturas recibidas, ${projects.length} proyectos`,
      )
    }

    // Calcular totales de facturas por estado
    const totalInvoices = invoices.length
    const paidInvoices = invoices.filter((inv) => inv.status === "paid")
    const pendingInvoices = invoices.filter((inv) => inv.status === "pending" || inv.status === "overdue").length
    console.log("Facturas pagadas:", paidInvoices)

    // Calcular totales de facturas recibidas
    const totalReceivedInvoices = receivedInvoices.length
    const recordedReceived = receivedInvoices.filter((inv) => inv.status === "recorded")
    console.log("Facturas recibidas contabilizadas:", recordedReceived)

    // Calcular totales de proyectos por estado
    const wonProjects = projects.filter((proj) => proj.status === "won").length
    const lostProjects = projects.filter((proj) => proj.status === "lost").length
    const pendingProjects = projects.filter((proj) => proj.status === "pending").length

    // Generar datos mensuales para el período filtrado o los últimos 12 meses
    const monthlyData = generateMonthlyData(invoices, receivedInvoices, startDate, endDate)
    console.log("monthlyData generado:", monthlyData)

    // Calcular ingresos y gastos del período
    const totalIncome = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const totalExpenses = recordedReceived.reduce((sum, inv) => sum + Number(inv.total), 0)

    // Para el mes actual, usar los datos del último mes en monthlyData
    const currentMonthData = monthlyData[monthlyData.length - 1] || { income: 0, expenses: 0 }

    return {
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
  const months = []

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
  invoices.forEach((invoice) => {
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
  receivedInvoices.forEach((invoice) => {
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
