"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PDFDownloadButtonProps {
  invoiceId: string
  invoiceNumber: string
  type: 'invoice' | 'received-invoice'
  children?: React.ReactNode
}

export function PDFDownloadButton({ invoiceId, invoiceNumber, type, children }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    setIsGenerating(true)
    
    try {
      // Obtener los datos de la factura desde el servidor
      const response = await fetch(`/api/${type === 'invoice' ? 'invoices' : 'received-invoices'}/${invoiceId}/data`)
      
      if (!response.ok) {
        throw new Error('No se pudieron obtener los datos de la factura')
      }
      
      const invoiceData = await response.json()
      
      // Generar HTML para la factura
      const html = generateInvoiceHTML(invoiceData, type)
      
      // Crear un elemento temporal para renderizar el HTML
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
      
      // Importar dinámicamente las librerías
      const [jsPDF, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])
      
      // Convertir HTML a canvas
      const canvas = await html2canvas.default(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Generar PDF
      const pdf = new jsPDF.default('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      // Descargar PDF
      pdf.save(`${type === 'invoice' ? 'Factura' : 'FacturaRecibida'}-${invoiceNumber}.pdf`)
      
      // Limpiar
      document.body.removeChild(tempDiv)
      
      toast({
        title: "PDF generado",
        description: "El PDF se ha descargado correctamente",
      })
      
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF. Inténtalo de nuevo.",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isGenerating}
    >
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? "Generando..." : children || "Descargar PDF"}
    </Button>
  )
}

function generateInvoiceHTML(invoiceData: any, type: 'invoice' | 'received-invoice'): string {
  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(amount))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES").format(date)
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
        <div>
          <h1 style="margin: 0; color: #333; font-size: 24px;">
            ${type === 'invoice' ? 'FACTURA' : 'FACTURA RECIBIDA'} #${invoiceData.number}
          </h1>
          <p style="margin: 5px 0; color: #666;">
            Fecha: ${formatDate(invoiceData.date)}
            ${invoiceData.dueDate ? ` | Vencimiento: ${formatDate(invoiceData.dueDate)}` : ''}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold; color: #333;">
            ${invoiceData.business?.name || 'Empresa'}
          </div>
          <div style="font-size: 12px; color: #666;">
            NIF: ${invoiceData.business?.nif || ''}
          </div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
            ${type === 'invoice' ? 'Cliente' : 'Proveedor'}
          </h3>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
            <div style="font-weight: bold; margin-bottom: 5px;">
              ${type === 'invoice' ? invoiceData.client?.name : invoiceData.provider?.name || invoiceData.providerName}
            </div>
            <div style="font-size: 12px; color: #666;">
              ${type === 'invoice' ? invoiceData.client?.address : invoiceData.provider?.address || ''}
            </div>
            <div style="font-size: 12px; color: #666;">
              NIF: ${type === 'invoice' ? invoiceData.client?.nif : invoiceData.provider?.nif || invoiceData.providerNIF}
            </div>
          </div>
        </div>

        ${invoiceData.concept ? `
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Concepto</h3>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
              ${invoiceData.concept}
            </div>
          </div>
        ` : ''}
      </div>

      ${invoiceData.lines && invoiceData.lines.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Descripción</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Cantidad</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Precio</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">IVA</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.lines.map((line: any) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">${line.description}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${line.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(line.unitPrice)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${line.taxRate}%</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(line.quantity * line.unitPrice * (1 + line.taxRate / 100))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div style="text-align: right; margin-top: 30px;">
        <table style="margin-left: auto; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 15px; font-weight: bold;">Subtotal:</td>
            <td style="padding: 5px 15px; text-align: right;">${formatCurrency(invoiceData.subtotal || 0)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 15px; font-weight: bold;">IVA:</td>
            <td style="padding: 5px 15px; text-align: right;">${formatCurrency(invoiceData.taxAmount || 0)}</td>
          </tr>
          <tr style="border-top: 2px solid #333;">
            <td style="padding: 5px 15px; font-weight: bold; font-size: 16px;">TOTAL:</td>
            <td style="padding: 5px 15px; text-align: right; font-weight: bold; font-size: 16px;">${formatCurrency(invoiceData.total || 0)}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center;">
        <p>Documento generado automáticamente por FactuOne</p>
        <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
      </div>
    </div>
  `
} 