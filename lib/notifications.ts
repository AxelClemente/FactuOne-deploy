import { getDb } from "@/lib/db"
import { notifications } from "@/app/db/schema"
import { randomUUID } from "crypto"

export type NotificationType = "info" | "success" | "warning" | "error" | "update" | "action"

export async function createNotification({
  userId,
  businessId,
  type = "action",
  title,
  message,
  actionUrl,
}: {
  userId?: string
  businessId?: string
  type?: NotificationType
  title: string
  message: string
  actionUrl?: string
}) {
  const db = await getDb()
  await db.insert(notifications).values({
    id: randomUUID(),
    user_id: userId ?? null,
    business_id: businessId ?? null,
    type,
    title,
    message,
    is_read: false,
    created_at: new Date(),
    action_url: actionUrl ?? null,
  })
} 