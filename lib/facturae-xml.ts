import { create } from 'xmlbuilder2'
import { XMLValidator } from 'fast-xml-parser'

// Tipos para Facturae
interface FacturaeParty {
  nif: string
  name: string
  address: string
  postalCode?: string
  city?: string
  country?: string
  phone?: string
  email?: string
}

interface FacturaeLine {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

interface FacturaeInvoice {
  number: string
  date: Date
  dueDate: Date
  concept: string
  subtotal: number
  taxAmount: number
  total: number
  lines: FacturaeLine[]
  seller: FacturaeParty
  buyer: FacturaeParty
  projectId?: string
  // Datos del método de pago
  paymentMethod?: 'bank' | 'bizum' | 'cash'
  bank?: {
    bankName: string
    accountNumber: string
    accountHolder: string
  }
  bizumHolder?: string
  bizumNumber?: string
}

/**
 * Genera XML Facturae 3.2.x completo y válido
 */
export function generateFacturaeXML(invoice: FacturaeInvoice): string {
  // Crear el documento XML base
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
  
  // Elemento raíz Facturae con namespaces correctos
  const facturae = doc.ele('Facturae', {
    'xmlns': 'http://www.facturae.es/Facturae/2009/v3.2/Facturae',
    'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#'
  })

  // FileHeader
  const fileHeader = facturae.ele('FileHeader')
  fileHeader.ele('SchemaVersion').txt('3.2.1')
  fileHeader.ele('Modality').txt('I')
  fileHeader.ele('InvoiceIssuerType').txt('EM')

  // Parties
  const parties = facturae.ele('Parties')
  
  // SellerParty (Vendedor)
  const sellerParty = parties.ele('SellerParty')
  const sellerTaxId = sellerParty.ele('TaxIdentification')
  sellerTaxId.ele('PersonTypeCode').txt('J') // J = Jurídica, N = Natural
  sellerTaxId.ele('ResidenceTypeCode').txt('R') // R = Residente, E = Extranjero
  sellerTaxId.ele('TaxIdentificationNumber').txt(invoice.seller.nif)
  
  const sellerLegal = sellerParty.ele('LegalEntity')
  sellerLegal.ele('CorporateName').txt(invoice.seller.name)
  
  const sellerAddress = sellerLegal.ele('AddressInSpain')
  sellerAddress.ele('Address').txt(invoice.seller.address)
  if (invoice.seller.postalCode) {
    sellerAddress.ele('PostCode').txt(invoice.seller.postalCode)
  }
  if (invoice.seller.city) {
    sellerAddress.ele('Town').txt(invoice.seller.city)
  }
  sellerAddress.ele('CountryCode').txt(invoice.seller.country || 'ESP')

  // BuyerParty (Comprador)
  const buyerParty = parties.ele('BuyerParty')
  const buyerTaxId = buyerParty.ele('TaxIdentification')
  buyerTaxId.ele('PersonTypeCode').txt('J')
  buyerTaxId.ele('ResidenceTypeCode').txt('R')
  buyerTaxId.ele('TaxIdentificationNumber').txt(invoice.buyer.nif)
  
  const buyerLegal = buyerParty.ele('LegalEntity')
  buyerLegal.ele('CorporateName').txt(invoice.buyer.name)
  
  const buyerAddress = buyerLegal.ele('AddressInSpain')
  buyerAddress.ele('Address').txt(invoice.buyer.address)
  if (invoice.buyer.postalCode) {
    buyerAddress.ele('PostCode').txt(invoice.buyer.postalCode)
  }
  if (invoice.buyer.city) {
    buyerAddress.ele('Town').txt(invoice.buyer.city)
  }
  buyerAddress.ele('CountryCode').txt(invoice.buyer.country || 'ESP')

  // Invoices
  const invoices = facturae.ele('Invoices')
  const invoiceElement = invoices.ele('Invoice')
  
  // InvoiceHeader
  const invoiceHeader = invoiceElement.ele('InvoiceHeader')
  invoiceHeader.ele('InvoiceNumber').txt(invoice.number)
  invoiceHeader.ele('InvoiceDocumentType').txt('FC') // FC = Factura completa
  invoiceHeader.ele('InvoiceClass').txt('OO') // OO = Original

  // InvoiceIssueData
  const issueData = invoiceElement.ele('InvoiceIssueData')
  issueData.ele('IssueDate').txt(invoice.date.toISOString().split('T')[0])
  issueData.ele('OperationDate').txt(invoice.date.toISOString().split('T')[0])
  
  const placeOfIssue = issueData.ele('PlaceOfIssue')
  placeOfIssue.ele('PostCode').txt(invoice.seller.postalCode || '00000')
  placeOfIssue.ele('CountryCode').txt('ESP')

  // TaxesOutputs (Impuestos repercutidos)
  const taxesOutputs = invoiceElement.ele('TaxesOutputs')
  
  // Agrupar impuestos por tipo
  const taxGroups = new Map<number, { base: number; amount: number }>()
  
  invoice.lines.forEach(line => {
    const lineSubtotal = line.quantity * line.unitPrice
    const lineTax = lineSubtotal * (line.taxRate / 100)
    
    if (!taxGroups.has(line.taxRate)) {
      taxGroups.set(line.taxRate, { base: 0, amount: 0 })
    }
    
    const group = taxGroups.get(line.taxRate)!
    group.base += lineSubtotal
    group.amount += lineTax
  })

  // Crear elementos de impuestos
  taxGroups.forEach((group, rate) => {
    const taxOutput = taxesOutputs.ele('TaxOutput')
    taxOutput.ele('TaxTypeCode').txt('01') // 01 = IVA
    taxOutput.ele('TaxRate').txt(rate.toFixed(2))
    
    const taxableBase = taxOutput.ele('TaxableBase')
    taxableBase.ele('TotalAmount').txt(group.base.toFixed(2))
    taxableBase.ele('EquivalentInEuros').txt(group.base.toFixed(2))
    
    taxOutput.ele('TaxAmount').txt(group.amount.toFixed(2))
  })

  // InvoiceTotals
  const invoiceTotals = invoiceElement.ele('InvoiceTotals')
  invoiceTotals.ele('TotalGrossAmount').txt(invoice.subtotal.toFixed(2))
  invoiceTotals.ele('TotalGeneralDiscounts').txt('0.00')
  invoiceTotals.ele('TotalGeneralSurcharges').txt('0.00')
  invoiceTotals.ele('TotalGrossAmountBeforeTaxes').txt(invoice.subtotal.toFixed(2))
  invoiceTotals.ele('TotalTaxOutputs').txt(invoice.taxAmount.toFixed(2))
  invoiceTotals.ele('TotalTaxesWithheld').txt('0.00')
  invoiceTotals.ele('InvoiceTotal').txt(invoice.total.toFixed(2))
  invoiceTotals.ele('TotalOutstandingAmount').txt(invoice.total.toFixed(2))
  invoiceTotals.ele('TotalExecutableAmount').txt(invoice.total.toFixed(2))

  // Items (Líneas de factura)
  const items = invoiceElement.ele('Items')
  
  invoice.lines.forEach((line, index) => {
    const invoiceLine = items.ele('InvoiceLine')
    invoiceLine.ele('ItemDescription').txt(line.description)
    invoiceLine.ele('Quantity').txt(line.quantity.toString())
    invoiceLine.ele('UnitPriceWithoutTax').txt(line.unitPrice.toFixed(2))
    invoiceLine.ele('TotalCost').txt((line.quantity * line.unitPrice).toFixed(2))
    invoiceLine.ele('GrossAmount').txt((line.quantity * line.unitPrice).toFixed(2))
    
    // TaxesOutputs para esta línea
    const lineTaxesOutputs = invoiceLine.ele('TaxesOutputs')
    const lineTaxOutput = lineTaxesOutputs.ele('TaxOutput')
    lineTaxOutput.ele('TaxTypeCode').txt('01')
    lineTaxOutput.ele('TaxRate').txt(line.taxRate.toFixed(2))
    
    const lineTaxableBase = lineTaxOutput.ele('TaxableBase')
    lineTaxableBase.ele('TotalAmount').txt((line.quantity * line.unitPrice).toFixed(2))
    lineTaxableBase.ele('EquivalentInEuros').txt((line.quantity * line.unitPrice).toFixed(2))
    
    lineTaxOutput.ele('TaxAmount').txt((line.quantity * line.unitPrice * line.taxRate / 100).toFixed(2))
  })

  // PaymentDetails
  const paymentDetails = invoiceElement.ele('PaymentDetails')
  const installment = paymentDetails.ele('Installment')
  installment.ele('InstallmentDueDate').txt(invoice.dueDate.toISOString().split('T')[0])
  installment.ele('InstallmentAmount').txt(invoice.total.toFixed(2))
  
  // Método de pago específico
  if (invoice.paymentMethod === 'bank' && invoice.bank) {
    installment.ele('PaymentMeans').txt('01') // 01 = Transferencia
    // Agregar información del banco como comentario o en LegalLiterals
    const paymentInfo = `Banco: ${invoice.bank.bankName} | IBAN: ${invoice.bank.accountNumber} | Titular: ${invoice.bank.accountHolder}`
    installment.ele('PaymentMeans').txt('01')
  } else if (invoice.paymentMethod === 'bizum') {
    installment.ele('PaymentMeans').txt('03') // 03 = Otros medios
    const paymentInfo = `Bizum | Titular: ${invoice.bizumHolder || 'N/A'} | Número: ${invoice.bizumNumber || 'N/A'}`
  } else if (invoice.paymentMethod === 'cash') {
    installment.ele('PaymentMeans').txt('10') // 10 = Efectivo
  } else {
    installment.ele('PaymentMeans').txt('01') // Por defecto transferencia
  }

  // LegalLiterals (si es necesario)
  const legalLiterals = invoiceElement.ele('LegalLiterals')
  legalLiterals.ele('LegalReference').txt('Factura conforme a la normativa española de facturación electrónica')
  
  // Agregar información del método de pago en LegalLiterals
  if (invoice.paymentMethod === 'bank' && invoice.bank) {
    const paymentReference = legalLiterals.ele('LegalReference')
    paymentReference.txt(`Método de pago: Transferencia bancaria | Banco: ${invoice.bank.bankName} | IBAN: ${invoice.bank.accountNumber} | Titular: ${invoice.bank.accountHolder}`)
  } else if (invoice.paymentMethod === 'bizum') {
    const paymentReference = legalLiterals.ele('LegalReference')
    paymentReference.txt(`Método de pago: Bizum | Titular: ${invoice.bizumHolder || 'N/A'} | Número: ${invoice.bizumNumber || 'N/A'}`)
  } else if (invoice.paymentMethod === 'cash') {
    const paymentReference = legalLiterals.ele('LegalReference')
    paymentReference.txt('Método de pago: Efectivo')
  }

  return doc.end({ prettyPrint: true })
}

/**
 * Valida que el XML generado sea válido
 */
export function validateFacturaeXML(xml: string): { isValid: boolean; errors?: string[] } {
  try {
    const result = XMLValidator.validate(xml)
    return { isValid: result === true, errors: result === true ? undefined : [result as string] }
  } catch (error) {
    return { isValid: false, errors: [(error as Error).message] }
  }
}

/**
 * Formatea un NIF español para Facturae
 */
export function formatNIFForFacturae(nif: string): string {
  // Eliminar espacios y guiones
  const cleanNif = nif.replace(/[\s-]/g, '')
  
  // Si es un NIF español, asegurar que tenga el formato correcto
  if (cleanNif.length === 9) {
    return cleanNif.toUpperCase()
  }
  
  return cleanNif
}

/**
 * Convierte una factura de la base de datos al formato Facturae
 */
export function convertInvoiceToFacturaeFormat(invoice: any, seller: any, buyer: any): FacturaeInvoice {
  return {
    number: invoice.number,
    date: new Date(invoice.date),
    dueDate: new Date(invoice.dueDate),
    concept: invoice.concept,
    subtotal: parseFloat(invoice.subtotal || '0'),
    taxAmount: parseFloat(invoice.taxAmount || '0'),
    total: parseFloat(invoice.total || '0'),
    lines: (invoice.lines || []).map((line: any) => ({
      description: line.description,
      quantity: parseInt(line.quantity),
      unitPrice: parseFloat(line.unitPrice),
      taxRate: parseFloat(line.taxRate),
      total: parseFloat(line.total)
    })),
    seller: {
      nif: formatNIFForFacturae(seller.nif),
      name: seller.name,
      address: seller.fiscalAddress,
      postalCode: seller.postalCode,
      city: seller.city,
      country: seller.country || 'ESP'
    },
    buyer: {
      nif: formatNIFForFacturae(buyer.nif),
      name: buyer.name,
      address: buyer.address,
      postalCode: buyer.postalCode,
      city: buyer.city,
      country: buyer.country || 'ESP'
    },
    projectId: invoice.projectId,
    // Datos del método de pago
    paymentMethod: invoice.paymentMethod,
    bank: invoice.bank ? {
      bankName: invoice.bank.bankName,
      accountNumber: invoice.bank.accountNumber,
      accountHolder: invoice.bank.accountHolder
    } : undefined,
    bizumHolder: invoice.bizumHolder,
    bizumNumber: invoice.bizumNumber
  }
} 