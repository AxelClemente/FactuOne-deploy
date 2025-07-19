"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db"
import { banks } from "@/app/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

export type BankWithStats = {
  id: string
  bankName: string
  accountHolder: string
  accountType: string
  nif: string
  accountNumber: string
  createdAt: Date
  updatedAt: Date
  _count: {
    invoices: number
  }
}

export async function getBanksWithStats(businessId: string, userId: string): Promise<BankWithStats[]> {
  console.log("[BANKS ACTIONS] getBanksWithStats - businessId:", businessId, "userId:", userId)

  try {
    const db = await getDb()
    
    // Obtener bancos con estadísticas de facturas
    const banksWithStats = await db
      .select({
        id: banks.id,
        bankName: banks.bankName,
        accountHolder: banks.accountHolder,
        accountType: banks.accountType,
        nif: banks.nif,
        accountNumber: banks.accountNumber,
        createdAt: banks.createdAt,
        updatedAt: banks.updatedAt,
        _count: sql<{ invoices: number }>`(
          SELECT COUNT(*) 
          FROM invoices 
          WHERE invoices.business_id = ${businessId}
        )`.as('_count')
      })
      .from(banks)
      .where(
        and(
          eq(banks.businessId, businessId),
          eq(banks.isDeleted, false)
        )
      )
      .orderBy(desc(banks.createdAt))

    console.log("[BANKS ACTIONS] Bancos encontrados:", banksWithStats.length)
    return banksWithStats
  } catch (error) {
    console.error("[BANKS ACTIONS] Error obteniendo bancos:", error)
    throw new Error("Error al obtener los bancos")
  }
}

export async function createBank(formData: FormData) {
  console.log("[BANKS ACTIONS] createBank iniciado")

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Usuario no autenticado")
    }

    const businessId = formData.get("businessId") as string
    const bankName = formData.get("bankName") as string
    const accountHolder = formData.get("accountHolder") as string
    const accountType = formData.get("accountType") as string
    const nif = formData.get("nif") as string
    const accountNumber = formData.get("accountNumber") as string

    if (!businessId || !bankName || !accountHolder || !accountType || !nif || !accountNumber) {
      throw new Error("Todos los campos son obligatorios")
    }

    const db = await getDb()
    const bankId = crypto.randomUUID()

    // Crear el banco
    await db
      .insert(banks)
      .values({
        id: bankId,
        businessId,
        bankName,
        accountHolder,
        accountType,
        nif,
        accountNumber,
        isDeleted: false,
      })

    console.log("[BANKS ACTIONS] Banco creado:", bankId)

    revalidatePath("/banks")
    redirect("/banks")
  } catch (error) {
    // Si es un NEXT_REDIRECT, no es un error real
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return
    }
    console.error("[BANKS ACTIONS] Error creando banco:", error)
    throw new Error(error instanceof Error ? error.message : "Error al crear el banco")
  }
}

export async function updateBank(formData: FormData) {
  console.log("[BANKS ACTIONS] updateBank iniciado")

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Usuario no autenticado")
    }

    const bankId = formData.get("bankId") as string
    const businessId = formData.get("businessId") as string
    const bankName = formData.get("bankName") as string
    const accountHolder = formData.get("accountHolder") as string
    const accountType = formData.get("accountType") as string
    const nif = formData.get("nif") as string
    const accountNumber = formData.get("accountNumber") as string

    console.log("[BANKS ACTIONS] Datos recibidos:", {
      bankId,
      businessId,
      bankName,
      accountHolder,
      accountType,
      nif,
      accountNumber
    })

    if (!bankId || !businessId || !bankName || !accountHolder || !accountType || !nif || !accountNumber) {
      throw new Error("Todos los campos son obligatorios")
    }

    const db = await getDb()
    console.log("[BANKS ACTIONS] Conexión a BD obtenida")

    // Actualizar el banco
    await db
      .update(banks)
      .set({
        bankName,
        accountHolder,
        accountType,
        nif,
        accountNumber,
        updatedAt: new Date(),
      })
      .where(eq(banks.id, bankId))

    console.log("[BANKS ACTIONS] Banco actualizado:", bankId)

    revalidatePath("/banks")
    redirect("/banks")
  } catch (error) {
    // Si es un NEXT_REDIRECT, no es un error real
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return
    }
    console.error("[BANKS ACTIONS] Error actualizando banco:", error)
    throw new Error(error instanceof Error ? error.message : "Error al actualizar el banco")
  }
}

export async function deleteBank(bankId: string, businessId: string) {
  console.log("[BANKS ACTIONS] deleteBank iniciado - bankId:", bankId)

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Usuario no autenticado")
    }

    const db = await getDb()

    // Obtener el banco antes de eliminarlo para el log
    const [bankToDelete] = await db
      .select()
      .from(banks)
      .where(eq(banks.id, bankId))

    if (!bankToDelete) {
      throw new Error("Banco no encontrado")
    }

    // Soft delete del banco
    await db
      .update(banks)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(banks.id, bankId))

    console.log("[BANKS ACTIONS] Banco eliminado:", bankId)

    revalidatePath("/banks")
    return { success: true }
  } catch (error) {
    console.error("[BANKS ACTIONS] Error eliminando banco:", error)
    throw new Error(error instanceof Error ? error.message : "Error al eliminar el banco")
  }
}

export async function getBankById(bankId: string): Promise<BankWithStats | null> {
  console.log("[BANKS ACTIONS] getBankById - bankId:", bankId)

  try {
    const db = await getDb()
    
    const [bank] = await db
      .select({
        id: banks.id,
        bankName: banks.bankName,
        accountHolder: banks.accountHolder,
        accountType: banks.accountType,
        nif: banks.nif,
        accountNumber: banks.accountNumber,
        createdAt: banks.createdAt,
        updatedAt: banks.updatedAt,
        _count: sql<{ invoices: number }>`(
          SELECT COUNT(*) 
          FROM invoices 
          WHERE invoices.business_id = banks.business_id
        )`.as('_count')
      })
      .from(banks)
      .where(
        and(
          eq(banks.id, bankId),
          eq(banks.isDeleted, false)
        )
      )

    return bank || null
  } catch (error) {
    console.error("[BANKS ACTIONS] Error obteniendo banco:", error)
    throw new Error("Error al obtener el banco")
  }
} 