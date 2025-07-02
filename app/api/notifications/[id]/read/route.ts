import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { notifications } from "@/app/db/schema"
import { eq } from "drizzle-orm"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb()
    const { id } = params
    await db.update(notifications).set({ is_read: true }).where(eq(notifications.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
