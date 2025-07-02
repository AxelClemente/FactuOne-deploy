import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { notifications } from "@/app/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const db = await getDb()
    // Obtener el businessId de la cookie
    const businessId = req.cookies.get("active_business")?.value
    console.log("[API/notifications] businessId de cookie:", businessId)
    if (!businessId) {
      return NextResponse.json({ notifications: [] })
    }
    // Obtener las notificaciones más recientes para el negocio
    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.business_id, businessId))
      .orderBy(desc(notifications.created_at))
      .limit(10)
    console.log(`[API/notifications] Notificaciones encontradas:`, notifs.length, notifs)
    return NextResponse.json({ notifications: notifs })
  } catch (error) {
    console.error("[API/notifications] Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
