import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

// Mock de notificaciones para desarrollo
const mockNotifications = [
  {
    id: "1",
    title: "Nueva factura recibida",
    summary: "Se ha recibido una nueva factura de Proveedor ABC por €1,250.00",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    isRead: false,
    link: "/received-invoices/1",
  },
  {
    id: "2",
    title: "Factura próxima a vencer",
    summary: "La factura FAC-2023-045 vence en 3 días",
    date: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
    isRead: false,
    link: "/invoices/1",
  },
  {
    id: "3",
    title: "Proyecto actualizado",
    summary: "El proyecto 'Desarrollo Web' ha cambiado de estado a 'En progreso'",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
    isRead: true,
    link: "/projects/1",
  },
  {
    id: "4",
    title: "Nuevo cliente registrado",
    summary: "Se ha registrado un nuevo cliente: Empresa XYZ S.L.",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
    isRead: true,
    link: "/clients",
  },
  {
    id: "5",
    title: "Backup completado",
    summary: "La copia de seguridad automática se ha completado exitosamente",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días atrás
    isRead: true,
    link: null,
  },
]

export async function GET(request: NextRequest) {
  try {
    // La llamada a getCurrentUser() se elimina para evitar errores de base de datos
    // durante el proceso de build en Vercel, ya que esta ruta devuelve datos mock.
    // if (!user) {
    //   return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    // }

    // En una aplicación real, aquí filtrarías por usuario y negocio activo
    // const businessId = await getActiveBusiness()
    // const notifications = await db.notification.findMany({
    //   where: { businessId, userId: user.id },
    //   orderBy: { date: 'desc' }
    // })

    // Simular un pequeño delay para mostrar el loading
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json(mockNotifications)
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
