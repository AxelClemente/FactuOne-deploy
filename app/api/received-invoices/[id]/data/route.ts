import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getReceivedInvoiceById } from "@/app/(dashboard)/received-invoices/actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getDb } from "@/lib/db"
import { businesses } from "@/app/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Validar usuario
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Obtener datos de la factura recibida
  const invoice = await getReceivedInvoiceById(params.id)
  if (!invoice) {
    return new Response("Factura recibida no encontrada", { status: 404 })
  }

  // 3. Validar que pertenece al negocio activo
  const activeBusinessId = await getActiveBusiness()
  if (!activeBusinessId || invoice.businessId !== activeBusinessId) {
    return new Response("Forbidden", { status: 403 })
  }

  // 4. Obtener datos del negocio
  const db = await getDb()
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, invoice.businessId),
  })

  // 5. Preparar datos completos para el PDF
  const invoiceData = {
    ...invoice,
    business: business || null,
    // Asegurar que los campos del método de pago estén presentes
    paymentMethod: invoice.paymentMethod || null,
    bankId: invoice.bankId || null,
    bizumHolder: invoice.bizumHolder || null,
    bizumNumber: invoice.bizumNumber || null,
    bank: invoice.bank || null,
  }

  // 6. Devolver datos en formato JSON
  return new Response(JSON.stringify(invoiceData), {
    headers: {
      "Content-Type": "application/json",
    },
  })
} 