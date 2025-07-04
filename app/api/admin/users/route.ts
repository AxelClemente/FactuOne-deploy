import { NextRequest, NextResponse } from 'next/server'
import { getDb } from "@/lib/db"
import { users } from "@/app/db/schema"
import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

export async function GET() {
  try {
    const db = await getDb()
    const result = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      isDeleted: users.isDeleted,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()
    const db = await getDb()

    // Validar email único
    const existing = await db.select().from(users).where(eq(users.email, email))
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "El email ya está registrado." }, { status: 400 })
    }

    const passwordHash = await hash(password, 10)
    await db.insert(users).values({
      id: randomUUID(),
      email,
      passwordHash,
      name,
      isDeleted: false,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
} 