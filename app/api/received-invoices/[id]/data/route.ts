import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getReceivedInvoiceById } from "@/app/(dashboard)/received-invoices/actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"

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

  // 4. Devolver datos en formato JSON
  return new Response(JSON.stringify(invoice), {
    headers: {
      "Content-Type": "application/json",
    },
  })
} 