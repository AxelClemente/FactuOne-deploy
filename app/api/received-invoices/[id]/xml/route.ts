import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getReceivedInvoiceById } from "@/app/(dashboard)/received-invoices/actions"
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

  // 4. Obtener datos del negocio para el XML
  const db = await getDb()
  const [business] = await db.select().from(businesses).where(eq(businesses.id, activeBusinessId))
  if (!business) {
    return new Response("Negocio no encontrado", { status: 404 })
  }

  // 5. Preparar datos para Facturae (para facturas recibidas, el proveedor es el vendedor)
  const facturaeInvoice = {
    number: invoice.number,
    date: new Date(invoice.date),
    dueDate: new Date(invoice.dueDate),
    concept: invoice.category || "Factura recibida",
    subtotal: parseFloat(invoice.amount || '0'),
    taxAmount: parseFloat(invoice.taxAmount || '0'),
    total: parseFloat(invoice.total || '0'),
    lines: [{
      description: invoice.category || "Servicio recibido",
      quantity: 1,
      unitPrice: parseFloat(invoice.amount || '0'),
      taxRate: parseFloat(invoice.taxAmount || '0') > 0 ? 21 : 0, // IVA por defecto
      total: parseFloat(invoice.total || '0')
    }],
    seller: {
      nif: invoice.provider?.nif || invoice.providerNIF || "",
      name: invoice.provider?.name || invoice.providerName || "",
      address: invoice.provider?.address || "",
      postalCode: invoice.provider?.postalCode,
      city: invoice.provider?.city,
      country: invoice.provider?.country || 'ESP'
    },
    buyer: {
      nif: business.nif,
      name: business.name,
      address: business.fiscalAddress,
      postalCode: undefined, // No disponible en el modelo actual
      city: undefined, // No disponible en el modelo actual
      country: 'ESP'
    },
    projectId: invoice.projectId
  }

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
      "Content-Disposition": `attachment; filename=FacturaRecibida-${invoice.number}.xml`,
    },
  })
} 