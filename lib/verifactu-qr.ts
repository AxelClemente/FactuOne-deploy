import QRCode from 'qrcode'
import { generateQRContent } from './verifactu-hash'

/**
 * Opciones para la generación del código QR
 */
export interface QROptions {
  width?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

/**
 * Genera un código QR como Data URL (base64) para incluir en HTML/PDF
 * @param invoiceData Datos de la factura
 * @param isVerifactu Si es un sistema VERI*FACTU
 * @param options Opciones de generación del QR
 * @returns Data URL del código QR
 */
export async function generateQRDataURL(
  invoiceData: {
    businessNIF: string
    invoiceNumber: string
    invoiceDate: string
    total: string
    hash: string
  },
  isVerifactu: boolean = true,
  options: QROptions = {}
): Promise<string> {
  const qrContent = generateQRContent(invoiceData, isVerifactu)
  
  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    width: options.width || 200,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF'
    },
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    type: 'image/png'
  }
  
  try {
    const dataUrl = await QRCode.toDataURL(qrContent, qrOptions)
    return dataUrl
  } catch (error) {
    console.error('Error generando código QR:', error)
    throw new Error('No se pudo generar el código QR')
  }
}

/**
 * Genera un código QR como SVG string para mayor calidad
 * @param invoiceData Datos de la factura
 * @param isVerifactu Si es un sistema VERI*FACTU
 * @param options Opciones de generación del QR
 * @returns SVG string del código QR
 */
export async function generateQRSVG(
  invoiceData: {
    businessNIF: string
    invoiceNumber: string
    invoiceDate: string
    total: string
    hash: string
  },
  isVerifactu: boolean = true,
  options: QROptions = {}
): Promise<string> {
  const qrContent = generateQRContent(invoiceData, isVerifactu)
  
  const qrOptions: QRCode.QRCodeToStringOptions = {
    width: options.width || 200,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF'
    },
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    type: 'svg'
  }
  
  try {
    const svg = await QRCode.toString(qrContent, qrOptions)
    return svg
  } catch (error) {
    console.error('Error generando código QR SVG:', error)
    throw new Error('No se pudo generar el código QR SVG')
  }
}

/**
 * Genera un código QR como Buffer para guardar en archivo
 * @param invoiceData Datos de la factura
 * @param isVerifactu Si es un sistema VERI*FACTU
 * @param options Opciones de generación del QR
 * @returns Buffer del código QR
 */
export async function generateQRBuffer(
  invoiceData: {
    businessNIF: string
    invoiceNumber: string
    invoiceDate: string
    total: string
    hash: string
  },
  isVerifactu: boolean = true,
  options: QROptions = {}
): Promise<Buffer> {
  const qrContent = generateQRContent(invoiceData, isVerifactu)
  
  const qrOptions: QRCode.QRCodeToBufferOptions = {
    width: options.width || 200,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF'
    },
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    type: 'png'
  }
  
  try {
    const buffer = await QRCode.toBuffer(qrContent, qrOptions)
    return buffer
  } catch (error) {
    console.error('Error generando buffer de código QR:', error)
    throw new Error('No se pudo generar el buffer del código QR')
  }
}

/**
 * Genera HTML para mostrar el código QR con la leyenda VERI*FACTU
 * @param qrDataUrl Data URL del código QR
 * @param isVerifactu Si mostrar la leyenda VERI*FACTU
 * @returns HTML string
 */
export function generateQRHTML(qrDataUrl: string, isVerifactu: boolean = true): string {
  const legend = isVerifactu 
    ? 'Factura verificable en la sede electrónica de la AEAT' 
    : ''
  
  return `
    <div style="text-align: center; margin: 20px 0;">
      <img src="${qrDataUrl}" alt="Código QR VERI*FACTU" style="width: 150px; height: 150px;" />
      ${legend ? `<p style="font-size: 10px; margin-top: 5px; color: #666;">${legend}</p>` : ''}
    </div>
  `
}

/**
 * Valida que el contenido del QR cumpla con las especificaciones
 * @param qrContent Contenido del código QR
 * @returns true si es válido
 */
export function validateQRContent(qrContent: string): boolean {
  try {
    const url = new URL(qrContent)
    
    // Verificar que sea la URL correcta de la AEAT
    if (!url.hostname.includes('agenciatributaria.gob.es')) {
      return false
    }
    
    // Verificar parámetros obligatorios
    const requiredParams = ['nif', 'numserie', 'fecha', 'importe', 'hash', 'ver']
    for (const param of requiredParams) {
      if (!url.searchParams.has(param)) {
        return false
      }
    }
    
    return true
  } catch {
    return false
  }
}