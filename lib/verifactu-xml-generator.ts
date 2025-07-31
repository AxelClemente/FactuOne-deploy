import { create } from 'xmlbuilder2'
import { XMLValidator } from 'fast-xml-parser'
import { VerifactuRegistry, VerifactuConfig } from '@/app/db/schema'
import { formatDateForVerifactu, formatAmountForVerifactu } from './verifactu-hash'

/**
 * Tipos para la estructura XML VERI*FACTU según esquemas AEAT
 */

interface RegistroFacturacion {
  // Identificación del registro
  IDEmisorFactura: string // NIF del emisor
  NumSerieFacturaEmisor: string // Número de serie de la factura
  FechaExpedicionFacturaEmisor: string // Fecha de expedición (YYYY-MM-DD)
  
  // Tipo de factura
  TipoFactura: 'F1' | 'F2' | 'F3' | 'F4' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' // F1 = Factura (lo más común)
  
  // Clave de régimen especial (siempre '01' para régimen general)
  ClaveRegimenEspecialOTrascendencia: '01'
  
  // Importes
  ImporteTotal: string // Importe total de la factura
  
  // Desglose de impuestos
  Desglose: {
    DesgloseTipoOperacion: {
      EntregasYServicios?: {
        Sujeta?: {
          NoExenta?: {
            DesgloseIVA: {
              DetalleIVA: Array<{
                TipoImpositivo: string // Tipo impositivo (ej: 21.00)
                BaseImponible: string // Base imponible
                CuotaRepercutida: string // Cuota de IVA
              }>
            }
          }
        }
      }
    }
  }
  
  // Contraparte (cliente o proveedor)
  Contraparte?: {
    NombreRazon: string // Nombre o razón social
    NIF?: string // NIF si es residente en España
  }
  
  // Hash encadenado
  Huella: string // Hash del registro actual
  HuellaAnterior?: string // Hash del registro anterior
}

interface CabeceraRegistro {
  ObligadoEmision: {
    NIF: string // NIF del obligado a la emisión
    Nombre: string // Nombre o razón social
  }
  Representante?: {
    NIF: string
    Nombre: string
  }
  RemisionVoluntaria?: {
    FechaFinVeriFactu: string // Fecha hasta la que se envían registros
  }
}

/**
 * Generador de XML completo para registros VERI*FACTU según esquemas AEAT
 */
export class VerifactuXmlGenerator {
  
  /**
   * Genera el XML completo de registro de facturación para envío a AEAT
   */
  static generateRegistrationXML(
    registry: VerifactuRegistry,
    config: VerifactuConfig,
    businessData: {
      nif: string
      name: string
      fiscalAddress: string
    },
    invoiceData: {
      number: string
      date: Date
      total: number
      subtotal: number
      taxAmount: number
      lines: Array<{
        taxRate: number
        quantity: number
        unitPrice: number
        total: number
      }>
    },
    contraparteData: {
      name: string
      nif: string
    }
  ): string {
    
    // Crear documento XML
    const root = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Elemento raíz con namespaces
    const regFactu = root.ele('RegFactuSistemaFacturacion', {
      xmlns: 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd'
    })
    
    // 1. Cabecera
    const cabecera = regFactu.ele('Cabecera')
    const obligadoEmision = cabecera.ele('ObligadoEmision')
    obligadoEmision.ele('NIF').txt(businessData.nif)
    obligadoEmision.ele('Nombre').txt(businessData.name)
    
    // Remisión voluntaria (indicamos que es VERI*FACTU)
    if (config.mode === 'verifactu') {
      const remisionVoluntaria = cabecera.ele('RemisionVoluntaria')
      remisionVoluntaria.ele('FechaFinVeriFactu').txt(formatDateForVerifactu(new Date()))
    }
    
    // 2. Registro de facturación
    const registroFacturacion = regFactu.ele('RegistroFacturacion')
    
    // Identificación del registro
    registroFacturacion.ele('IDEmisorFactura').txt(registry.invoiceType === 'sent' ? businessData.nif : contraparteData.nif)
    registroFacturacion.ele('NumSerieFacturaEmisor').txt(invoiceData.number)
    registroFacturacion.ele('FechaExpedicionFacturaEmisor').txt(formatDateForVerifactu(invoiceData.date))
    
    // Tipo de factura (F1 = Factura normal)
    registroFacturacion.ele('TipoFactura').txt('F1')
    
    // Clave de régimen especial (01 = Régimen general)
    registroFacturacion.ele('ClaveRegimenEspecialOTrascendencia').txt('01')
    
    // Importe total
    registroFacturacion.ele('ImporteTotal').txt(formatAmountForVerifactu(invoiceData.total))
    
    // Desglose de impuestos
    const desglose = registroFacturacion.ele('Desglose')
    const desgloseTipoOperacion = desglose.ele('DesgloseTipoOperacion')
    const entregasYServicios = desgloseTipoOperacion.ele('EntregasYServicios')
    const sujeta = entregasYServicios.ele('Sujeta')
    const noExenta = sujeta.ele('NoExenta')
    const desgloseIVA = noExenta.ele('DesgloseIVA')
    
    // Agrupar líneas por tipo impositivo
    const ivaGroups = new Map<number, { base: number, cuota: number }>()
    
    for (const line of invoiceData.lines) {
      const taxRate = line.taxRate
      const baseImponible = line.quantity * line.unitPrice
      const cuotaIVA = baseImponible * (taxRate / 100)
      
      if (ivaGroups.has(taxRate)) {
        const existing = ivaGroups.get(taxRate)!
        ivaGroups.set(taxRate, {
          base: existing.base + baseImponible,
          cuota: existing.cuota + cuotaIVA
        })
      } else {
        ivaGroups.set(taxRate, {
          base: baseImponible,
          cuota: cuotaIVA
        })
      }
    }
    
    // Crear detalles de IVA
    for (const [taxRate, amounts] of ivaGroups) {
      const detalleIVA = desgloseIVA.ele('DetalleIVA')
      detalleIVA.ele('TipoImpositivo').txt(taxRate.toFixed(2))
      detalleIVA.ele('BaseImponible').txt(formatAmountForVerifactu(amounts.base))
      detalleIVA.ele('CuotaRepercutida').txt(formatAmountForVerifactu(amounts.cuota))
    }
    
    // Contraparte
    const contraparte = registroFacturacion.ele('Contraparte')
    contraparte.ele('NombreRazon').txt(contraparteData.name)
    contraparte.ele('NIF').txt(contraparteData.nif)
    
    // Hash encadenado CRÍTICO para VERI*FACTU
    registroFacturacion.ele('Huella').txt(registry.currentHash)
    if (registry.previousHash) {
      registroFacturacion.ele('HuellaAnterior').txt(registry.previousHash)
    }
    
    return root.end({ prettyPrint: true })
  }
  
  /**
   * Genera XML de consulta de estado de un registro
   */
  static generateQueryXML(
    businessNIF: string,
    businessName: string,
    invoiceNumber: string,
    invoiceDate: Date
  ): string {
    
    const root = create({ version: '1.0', encoding: 'UTF-8' })
    
    const consultaFactu = root.ele('ConsultaFactuSistemaFacturacion', {
      xmlns: 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/ConsultaLR.xsd'
    })
    
    // Cabecera
    const cabecera = consultaFactu.ele('Cabecera')
    const obligadoEmision = cabecera.ele('ObligadoEmision')
    obligadoEmision.ele('NIF').txt(businessNIF)
    obligadoEmision.ele('Nombre').txt(businessName)
    
    // Consulta
    const consulta = consultaFactu.ele('Consulta')
    consulta.ele('IDEmisorFactura').txt(businessNIF)
    consulta.ele('NumSerieFacturaEmisor').txt(invoiceNumber)
    consulta.ele('FechaExpedicionFacturaEmisor').txt(formatDateForVerifactu(invoiceDate))
    
    return root.end({ prettyPrint: true })
  }
  
  /**
   * Valida un XML contra el esquema básico
   */
  static validateXML(xmlContent: string): { isValid: boolean; errors?: string[] } {
    try {
      const result = XMLValidator.validate(xmlContent, {
        allowBooleanAttributes: false,
        unpairedTags: []
      })
      
      if (result === true) {
        return { isValid: true }
      } else {
        return { 
          isValid: false, 
          errors: Array.isArray(result) ? result : [result.toString()] 
        }
      }
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error instanceof Error ? error.message : 'Error desconocido validando XML'] 
      }
    }
  }
  
  /**
   * Verifica que el XML contiene los elementos obligatorios para VERI*FACTU
   */
  static validateVerifactuRequirements(xmlContent: string): { isValid: boolean; missingElements?: string[] } {
    const requiredElements = [
      'IDEmisorFactura',
      'NumSerieFacturaEmisor', 
      'FechaExpedicionFacturaEmisor',
      'TipoFactura',
      'ClaveRegimenEspecialOTrascendencia',
      'ImporteTotal',
      'Desglose',
      'Huella'
    ]
    
    const missingElements: string[] = []
    
    for (const element of requiredElements) {
      if (!xmlContent.includes(`<${element}>`)) {
        missingElements.push(element)
      }
    }
    
    return {
      isValid: missingElements.length === 0,
      missingElements: missingElements.length > 0 ? missingElements : undefined
    }
  }
  
  /**
   * Extrae información básica de un XML de respuesta de la AEAT
   */
  static parseAeatResponse(xmlResponse: string): {
    success: boolean
    csv?: string
    errorCode?: string
    errorMessage?: string
    registroAprobado?: boolean
  } {
    try {
      // Buscar CSV de confirmación
      const csvMatch = xmlResponse.match(/<CSV[^>]*>([^<]+)<\/CSV>/i)
      const csv = csvMatch ? csvMatch[1] : undefined
      
      // Buscar códigos de error
      const errorCodeMatch = xmlResponse.match(/<CodigoError[^>]*>([^<]+)<\/CodigoError>/i)
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : undefined
      
      // Buscar mensajes de error
      const errorMessageMatch = xmlResponse.match(/<DescripcionError[^>]*>([^<]+)<\/DescripcionError>/i)
      const errorMessage = errorMessageMatch ? errorMessageMatch[1] : undefined
      
      // Verificar si el registro fue aprobado
      const registroAprobado = xmlResponse.includes('<EstadoRegistro>Correcto</EstadoRegistro>')
      
      return {
        success: !errorCode && registroAprobado,
        csv,
        errorCode,
        errorMessage,
        registroAprobado
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: 'Error procesando respuesta de la AEAT'
      }
    }
  }
  
  /**
   * Genera un XML mínimo para testing
   */
  static generateTestXML(businessNIF: string): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
    
    const regFactu = root.ele('RegFactuSistemaFacturacion', {
      xmlns: 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd'
    })
    
    // Cabecera mínima
    const cabecera = regFactu.ele('Cabecera')
    const obligadoEmision = cabecera.ele('ObligadoEmision')
    obligadoEmision.ele('NIF').txt(businessNIF)
    obligadoEmision.ele('Nombre').txt('EMPRESA TEST')
    
    // Registro de prueba
    const registro = regFactu.ele('RegistroFacturacion')
    registro.ele('IDEmisorFactura').txt(businessNIF)
    registro.ele('NumSerieFacturaEmisor').txt('TEST-001')
    registro.ele('FechaExpedicionFacturaEmisor').txt(formatDateForVerifactu(new Date()))
    registro.ele('TipoFactura').txt('F1')
    registro.ele('ClaveRegimenEspecialOTrascendencia').txt('01')
    registro.ele('ImporteTotal').txt('121.00')
    registro.ele('Huella').txt('ABCD1234567890ABCD1234567890ABCD12345678')
    
    return root.end({ prettyPrint: true })
  }
}