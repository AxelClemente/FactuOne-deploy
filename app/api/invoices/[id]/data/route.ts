import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getInvoiceWithLines } from "@/app/(dashboard)/invoices/actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getDb } from "@/lib/db"
import { businesses } from "@/app/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('[API] Iniciando GET /api/invoices/[id]/data con ID:', params.id)
  
  // 1. Validar usuario
  const user = await getCurrentUser()
  if (!user) {
    console.log('[API] Usuario no autenticado')
    return new Response("Unauthorized", { status: 401 })
  }
  console.log('[API] Usuario autenticado:', user.id)

  // 2. Obtener datos de la factura
  console.log('[API] Obteniendo factura con ID:', params.id)
  const invoice = await getInvoiceWithLines(params.id)
  if (!invoice) {
    console.log('[API] Factura no encontrada')
    return new Response("Factura no encontrada", { status: 404 })
  }
  console.log('[API] Factura obtenida:', {
    id: invoice.id,
    number: invoice.number,
    paymentMethod: invoice.paymentMethod,
    bankId: invoice.bankId,
    bizumHolder: invoice.bizumHolder,
    bizumNumber: invoice.bizumNumber,
    bank: invoice.bank ? {
      id: invoice.bank.id,
      bankName: invoice.bank.bankName,
      accountNumber: invoice.bank.accountNumber,
      accountHolder: invoice.bank.accountHolder
    } : null
  })

  // 3. Validar que pertenece al negocio activo
  const activeBusinessId = await getActiveBusiness()
  console.log('[API] Negocio activo:', activeBusinessId)
  if (!activeBusinessId || invoice.businessId !== activeBusinessId) {
    console.log('[API] Acceso denegado - factura no pertenece al negocio activo')
    return new Response("Forbidden", { status: 403 })
  }

  // 4. Obtener datos del negocio
  console.log('[API] Obteniendo datos del negocio:', invoice.businessId)
  const db = await getDb()
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, invoice.businessId),
  })
  console.log('[API] Datos del negocio obtenidos:', business ? {
    id: business.id,
    name: business.name,
    nif: business.nif
  } : null)

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
  
  console.log('[API] Datos finales preparados:', {
    paymentMethod: invoiceData.paymentMethod,
    bankId: invoiceData.bankId,
    bizumHolder: invoiceData.bizumHolder,
    bizumNumber: invoiceData.bizumNumber,
    bank: invoiceData.bank ? {
      id: invoiceData.bank.id,
      bankName: invoiceData.bank.bankName,
      accountNumber: invoiceData.bank.accountNumber,
      accountHolder: invoiceData.bank.accountHolder
    } : null
  })

  // 6. Devolver datos en formato JSON
  console.log('[API] Enviando respuesta JSON')
  return new Response(JSON.stringify(invoiceData), {
    headers: {
      "Content-Type": "application/json",
    },
  })
} 