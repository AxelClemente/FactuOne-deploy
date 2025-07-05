import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getInvoiceWithLines } from "@/app/(dashboard)/invoices/actions"
import { getActiveBusiness } from "@/lib/getActiveBusiness"
import { getDb } from "@/lib/db"
import { businesses } from "@/app/db/schema"
import { eq } from "drizzle-orm"
import { generateFacturaeXML, validateFacturaeXML, convertInvoiceToFacturaeFormat } from "@/lib/facturae-xml"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Validar usuario
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Obtener datos de la factura emitida
  const invoice = await getInvoiceWithLines(params.id)
  if (!invoice) {
    return new Response("Factura emitida no encontrada", { status: 404 })
  }

  // 3. Validar que pertenece al negocio activo
  const activeBusinessId = await getActiveBusiness()
  if (!activeBusinessId || invoice.businessId !== activeBusinessId) {
    return new Response("Forbidden", { status: 403 })
  }

  // 4. Obtener datos del negocio para el XML
  const db = await getDb()
  const [business] = await db.select().from(businesses).where(eq(businesses.id, activeBusinessId))
  if (!business) {
    return new Response("Negocio no encontrado", { status: 404 })
  }

  // 5. Convertir datos al formato Facturae
  const facturaeInvoice = convertInvoiceToFacturaeFormat(invoice, business, invoice.client)

  // 6. Generar XML Facturae 3.2.x completo y profesional
  const xml = generateFacturaeXML(facturaeInvoice)

  // 7. Validar el XML generado
  const validation = validateFacturaeXML(xml)
  if (!validation.isValid) {
    console.error('Error validando XML Facturae:', validation.errors)
    return new Response('Error generando XML Facturae válido', { status: 500 })
  }

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename=Factura-${invoice.number}.xml`,
    },
  })
} 