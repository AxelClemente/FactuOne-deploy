"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface PDFDownloadButtonProps {
  invoiceId: string
  invoiceNumber: string
  type: 'invoice' | 'received-invoice'
  children?: React.ReactNode
}

export function PDFDownloadButton({ invoiceId, invoiceNumber, type, children }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const { toast } = useToast()

  const handlePreview = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/${type === 'invoice' ? 'invoices' : 'received-invoices'}/${invoiceId}/data`)
      if (!response.ok) throw new Error('No se pudieron obtener los datos de la factura')
      const data = await response.json()
      
      // Obtener datos del registro VERI*FACTU si existe
      const verifactuResponse = await fetch(`/api/${type === 'invoice' ? 'invoices' : 'received-invoices'}/${invoiceId}/verifactu`)
      if (verifactuResponse.ok) {
        const verifactuData = await verifactuResponse.json()
        data.verifactu = verifactuData
      }
      
      setInvoiceData(data)
      setShowPreview(true)
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo cargar la factura para previsualización', variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/${type === 'invoice' ? 'invoices' : 'received-invoices'}/${invoiceId}/data`)
      if (!response.ok) throw new Error('No se pudieron obtener los datos de la factura')
      const data = await response.json()
      
      // Obtener datos del registro VERI*FACTU si existe
      const verifactuResponse = await fetch(`/api/${type === 'invoice' ? 'invoices' : 'received-invoices'}/${invoiceId}/verifactu`)
      if (verifactuResponse.ok) {
        const verifactuData = await verifactuResponse.json()
        data.verifactu = verifactuData
      }
      
      const html = generateInvoiceHTML(data, type)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '800px'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.padding = '40px'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.fontSize = '12px'
      document.body.appendChild(tempDiv)
      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, allowTaint: true })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
      pdf.save(`factura-${data.invoice?.number || invoiceNumber}.pdf`)
      document.body.removeChild(tempDiv)
    } catch (error) {
      toast({ title: 'Error', description: 'Error generando PDF', variant: 'destructive' })
    } finally {
      setIsGenerating(false)
      setShowPreview(false)
    }
  }

  return (
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogTrigger asChild>
        <Button onClick={handlePreview} disabled={isGenerating}>
          <Download className="mr-2 h-4 w-4" />
          {children || 'Descargar PDF'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-full">
        <DialogTitle>Previsualización de factura</DialogTitle>
        {invoiceData ? (
          <div style={{ maxHeight: '80vh', overflowY: 'auto', background: '#fff', padding: 0 }}>
            <div dangerouslySetInnerHTML={{ __html: generateInvoiceHTML(invoiceData, type) }} />
          </div>
        ) : (
          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando factura...</div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleDownload} disabled={isGenerating}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function generateInvoiceHTML(invoiceData: any, type: 'invoice' | 'received-invoice'): string {
  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(amount))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES").format(date)
  }

  // Obtener los taxRate únicos de las líneas
  const taxRates = Array.from(new Set((invoiceData.lines || []).map((line: any) => line.taxRate))).filter(Boolean)
  const taxRatesStr = taxRates.length > 0 ? taxRates.map(String).map(r => `${r}%`).join(', ') : ''

  return `
    <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; background: #fff; padding: 32px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #444; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="font-size: 15px; line-height: 1.5;">
          <div style="font-weight: bold;">${invoiceData.business?.name || ''}</div>
          <div>${invoiceData.business?.fiscalAddress || ''}</div>
          <div>${invoiceData.business?.nif ? 'NIF: ' + invoiceData.business.nif : ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; color: #222;">Nº de factura <span style="color: #d00; font-weight: bold;">${invoiceData.number || ''}</span></div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
        <div style="font-size: 28px; font-weight: bold; color: #222; border-bottom: 4px solid #889; display: inline-block; padding-right: 16px;">FACTURA</div>
        <div style="font-size: 14px;">Fecha: ${formatDate(invoiceData.date)}</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <div style="width: 48%; border: 2px solid #222; border-radius: 4px; padding: 8px 12px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Cliente</div>
          <div><strong>Nombre:</strong> ${invoiceData.client?.name || ''}</div>
          <div><strong>Dirección:</strong> ${invoiceData.client?.address || ''}</div>
          <div><strong>Ciudad:</strong> ${invoiceData.client?.city || ''}</div>
          <div><strong>NIF:</strong> ${invoiceData.client?.nif || ''}</div>
        </div>
        <div style="width: 48%; border: 2px solid #222; border-radius: 4px; padding: 8px 12px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Varios</div>
          <div><strong>Fecha:</strong> ${formatDate(invoiceData.date)}</div>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #bbb; padding: 8px; text-align: center;">Cantidad</th>
            <th style="border: 1px solid #bbb; padding: 8px; text-align: left;">Descripción</th>
            <th style="border: 1px solid #bbb; padding: 8px; text-align: right;">Precio unitario</th>
            <th style="border: 1px solid #bbb; padding: 8px; text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.lines && invoiceData.lines.length > 0 ? invoiceData.lines.map((line: any) => `
            <tr>
              <td style="border: 1px solid #bbb; padding: 8px; text-align: center;">${line.quantity}</td>
              <td style="border: 1px solid #bbb; padding: 8px;">${line.description}</td>
              <td style="border: 1px solid #bbb; padding: 8px; text-align: right;">${formatCurrency(line.unitPrice)}</td>
              <td style="border: 1px solid #bbb; padding: 8px; text-align: right; background: #f9f7e0;">${formatCurrency(line.quantity * line.unitPrice * (1 + (line.taxRate || 0) / 100))}</td>
            </tr>
          `).join('') : ''}
        </tbody>
      </table>
      <div style="display: flex; justify-content: flex-end; margin-top: 0;">
        <table style="margin-left: auto; border-collapse: collapse; min-width: 260px;">
          <tr>
            <td style="padding: 4px 10px;">Subtotal:</td>
            <td style="padding: 4px 10px; text-align: right;">${formatCurrency(invoiceData.subtotal || 0)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 10px;">Impuestos${taxRatesStr ? ` (${taxRatesStr})` : ''}:</td>
            <td style="padding: 4px 10px; text-align: right;">${formatCurrency(invoiceData.taxAmount || 0)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 10px; font-weight: bold; font-size: 16px;">TOTAL:</td>
            <td style="padding: 4px 10px; text-align: right; font-weight: bold; font-size: 16px;">${formatCurrency(invoiceData.total || 0)}</td>
          </tr>
        </table>
      </div>
      <div style="display: flex; margin-top: 16px;">
        <div style="width: 60%; border: 2px solid #222; border-radius: 4px; padding: 10px 14px; margin-right: 16px; background: #fff;">
          <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px;">Medio de pago</div>
          ${invoiceData.paymentMethod === 'bank' && invoiceData.bank ? `
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">TRANSFERENCIA</div>
            <div style="font-size: 12px; margin-bottom: 2px;">${invoiceData.bank.accountNumber ? invoiceData.bank.accountNumber : ''}</div>
            <div style="font-size: 12px;"><strong>Banco:</strong> ${invoiceData.bank.bankName || ''}</div>
            <div style="font-size: 12px;"><strong>IBAN:</strong> ${invoiceData.bank.accountNumber || ''}</div>
            <div style="font-size: 12px;"><strong>Nombre:</strong> ${invoiceData.bank.accountHolder || ''}</div>
          ` : ''}
          ${invoiceData.paymentMethod === 'bizum' ? `
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">BIZUM</div>
            <div style="font-size: 12px; margin-bottom: 2px;">${invoiceData.bizumNumber || ''}</div>
            <div style="font-size: 12px;"><strong>Titular:</strong> ${invoiceData.bizumHolder || ''}</div>
          ` : ''}
        </div>
        <div style="width: 40%; border: 2px solid #222; border-radius: 4px; padding: 10px 14px; background: #f9f7e0;">
          <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px;">Nota</div>
        </div>
      </div>
      ${invoiceData.verifactu ? `
        <div style="margin-top: 20px; text-align: center;">
          <img src="${invoiceData.verifactu.qrCode}" alt="Código QR VERI*FACTU" style="width: 150px; height: 150px;" />
          ${invoiceData.verifactu.isVerifiable ? `
            <p style="font-size: 11px; margin-top: 8px; color: #444; font-weight: bold;">
              Factura verificable en la sede electrónica de la AEAT
            </p>
          ` : ''}
        </div>
      ` : ''}
      <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #888;">
        Factura generada por FactuOne
      </div>
    </div>
  `
} 