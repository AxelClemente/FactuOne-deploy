import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getInvoiceWithLines } from "@/app/(dashboard)/invoices/actions"
import puppeteer from "puppeteer"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Validar usuario
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Obtener datos de la factura (con líneas y relaciones)
  const invoice = await getInvoiceWithLines(params.id)
  if (!invoice) {
    return new Response("Factura no encontrada", { status: 404 })
  }

  // 3. (Opcional) Validar permisos y pertenencia al negocio
  // TODO: Validar que el usuario puede acceder a esta factura

  // 4. Plantilla HTML con estilos básicos
  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(amount))

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Factura #${invoice.number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .logo { height: 48px; }
        .section { margin-bottom: 24px; }
        .section-title { font-weight: bold; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #f5f5f5; }
        .totals { margin-top: 24px; float: right; width: 300px; }
        .totals td { border: none; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://placehold.co/120x48?text=LOGO" class="logo" />
        <div>
          <h2>Factura #${invoice.number}</h2>
          <div>Fecha: ${invoice.date ? new Date(invoice.date).toLocaleDateString("es-ES") : "-"}</div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Emisor</div>
        <div>${invoice.business?.name || "-"}</div>
        <div>${invoice.business?.fiscalAddress || ""}</div>
        <div>NIF: ${invoice.business?.nif || ""}</div>
      </div>
      <div class="section">
        <div class="section-title">Cliente</div>
        <div>${invoice.client?.name || "-"}</div>
        <div>${invoice.client?.address || ""}</div>
        <div>NIF: ${invoice.client?.nif || ""}</div>
      </div>
      <div class="section">
        <div class="section-title">Concepto</div>
        <div>${invoice.concept || "-"}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>IVA (%)</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.lines || []).map((line: any) => `
            <tr>
              <td>${line.description}</td>
              <td>${Number(line.quantity)}</td>
              <td>${formatCurrency(line.unitPrice)}</td>
              <td>${Number(line.taxRate)}%</td>
              <td>${formatCurrency(Number(line.quantity) * Number(line.unitPrice) * (1 + Number(line.taxRate) / 100))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal:</td><td>${invoice.subtotal ? formatCurrency(invoice.subtotal) : "-"}</td></tr>
        <tr><td>IVA:</td><td>${invoice.tax ? formatCurrency(invoice.tax) : "-"}</td></tr>
        <tr><td><b>Total:</b></td><td><b>${invoice.total ? formatCurrency(invoice.total) : "-"}</b></td></tr>
      </table>
    </body>
  </html>
  `

  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true })
    await browser.close()

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Factura-${invoice.number}.pdf`,
      },
    })
  } catch (err) {
    return new Response("Error generando PDF: " + (err as Error).message, { status: 500 })
  }
} 