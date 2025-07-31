import crypto from 'crypto'

/**
 * Librería para generación de hash según especificaciones VERI*FACTU
 * 
 * El hash se calcula siguiendo el algoritmo definido por la AEAT:
 * - Se concatenan campos específicos del registro actual
 * - Se incluye el hash del registro anterior para crear la cadena
 * - Se aplica SHA-256 al resultado
 */

interface HashableInvoiceData {
  businessNIF: string // NIF del emisor
  invoiceNumber: string // Número de factura
  invoiceDate: string // Fecha de emisión (YYYY-MM-DD)
  clientNIF: string // NIF del receptor
  total: string // Importe total con 2 decimales
  previousHash?: string // Hash del registro anterior (null para el primero)
}

/**
 * Genera el hash de un registro de factura según especificaciones VERI*FACTU
 * @param data Datos de la factura para generar el hash
 * @returns Hash SHA-256 en formato hexadecimal
 */
export function generateVerifactuHash(data: HashableInvoiceData): string {
  // Construir la cadena a hashear según el formato AEAT
  // Formato: NIF_EMISOR|NUMERO_FACTURA|FECHA|NIF_RECEPTOR|IMPORTE_TOTAL|HASH_ANTERIOR
  const components = [
    data.businessNIF.toUpperCase().replace(/[-\s]/g, ''), // NIF sin guiones ni espacios
    data.invoiceNumber,
    data.invoiceDate.replace(/-/g, ''), // Fecha sin guiones (YYYYMMDD)
    data.clientNIF.toUpperCase().replace(/[-\s]/g, ''), // NIF sin guiones ni espacios
    data.total.replace('.', ','), // Importe con coma decimal
    data.previousHash || 'INICIAL' // Si no hay hash anterior, usar "INICIAL"
  ]
  
  const stringToHash = components.join('|')
  
  // Generar hash SHA-256
  const hash = crypto.createHash('sha256')
  hash.update(stringToHash, 'utf8')
  
  return hash.digest('hex').toUpperCase()
}

/**
 * Valida la integridad de una cadena de registros verificando los hashes
 * @param records Array de registros con sus hashes
 * @returns true si la cadena es válida, false si hay algún hash incorrecto
 */
export function validateHashChain(records: Array<{
  data: HashableInvoiceData,
  currentHash: string,
  previousHash: string | null
}>): boolean {
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    
    // Para el primer registro, previousHash debe ser null
    if (i === 0 && record.previousHash !== null) {
      return false
    }
    
    // Para registros posteriores, verificar que el previousHash coincida
    if (i > 0 && record.previousHash !== records[i - 1].currentHash) {
      return false
    }
    
    // Verificar que el hash actual sea correcto
    const calculatedHash = generateVerifactuHash({
      ...record.data,
      previousHash: record.previousHash || undefined
    })
    
    if (calculatedHash !== record.currentHash) {
      return false
    }
  }
  
  return true
}

/**
 * Genera el contenido del código QR para una factura
 * @param invoiceData Datos de la factura
 * @param isVerifactu Si es un sistema VERI*FACTU o no
 * @returns URL para el código QR
 */
export function generateQRContent(
  invoiceData: {
    businessNIF: string
    invoiceNumber: string
    invoiceDate: string
    total: string
    hash: string
  },
  isVerifactu: boolean = true
): string {
  // URL base de la sede electrónica de la AEAT
  const baseUrl = 'https://www2.agenciatributaria.gob.es/es13/h/qr'
  
  // Parámetros del QR
  const params = new URLSearchParams({
    nif: invoiceData.businessNIF.toUpperCase().replace(/[-\s]/g, ''),
    numserie: invoiceData.invoiceNumber,
    fecha: invoiceData.invoiceDate.replace(/-/g, ''),
    importe: invoiceData.total,
    hash: invoiceData.hash.substring(0, 8), // Primeros 8 caracteres del hash
    ver: isVerifactu ? '1' : '0' // 1 para VERI*FACTU, 0 para otros sistemas
  })
  
  return `${baseUrl}?${params.toString()}`
}

/**
 * Extrae los primeros 8 caracteres del hash para incluir en el QR
 * @param fullHash Hash completo SHA-256
 * @returns Primeros 8 caracteres en mayúsculas
 */
export function getHashForQR(fullHash: string): string {
  return fullHash.substring(0, 8).toUpperCase()
}

/**
 * Formatea un importe para su uso en VERI*FACTU
 * @param amount Importe numérico
 * @returns Importe formateado con 2 decimales y coma decimal
 */
export function formatAmountForVerifactu(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return numAmount.toFixed(2).replace('.', ',')
}

/**
 * Formatea una fecha para su uso en VERI*FACTU
 * @param date Fecha en formato Date o string
 * @returns Fecha en formato YYYYMMDD
 */
export function formatDateForVerifactu(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}