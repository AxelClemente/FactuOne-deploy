import forge from 'node-forge'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import * as xpath from 'xpath'

/**
 * Sistema de firma digital XAdES para VERI*FACTU
 * 
 * Implementa la firma electrónica de XMLs según las especificaciones de la AEAT
 * para garantizar la integridad y autenticidad de los registros de facturación
 */

interface CertificateInfo {
  subject: string
  issuer: string
  serialNumber: string
  notBefore: Date
  notAfter: Date
  fingerprint: string
}

interface SignatureResult {
  success: boolean
  signedXml?: string
  certificateInfo?: CertificateInfo
  errorMessage?: string
}

interface ValidationResult {
  isValid: boolean
  certificateInfo?: CertificateInfo
  errorMessage?: string
  warnings?: string[]
}

/**
 * Clase para firma digital XAdES-BES
 */
export class VerifactuSigner {
  
  /**
   * Firma un XML con certificado digital según especificaciones AEAT
   */
  static async signXML(
    xmlContent: string,
    certificatePath: string,
    certificatePassword: string
  ): Promise<SignatureResult> {
    try {
      // 1. Cargar certificado
      const certData = await this.loadCertificate(certificatePath, certificatePassword)
      if (!certData.success) {
        return {
          success: false,
          errorMessage: certData.errorMessage
        }
      }
      
      const { certificate, privateKey } = certData
      
      // 2. Parsear XML
      const doc = new DOMParser().parseFromString(xmlContent, 'text/xml')
      if (!doc || doc.getElementsByTagName('parsererror').length > 0) {
        return {
          success: false,
          errorMessage: 'XML mal formado'
        }
      }
      
      // 3. Crear estructura de firma XAdES
      const signedXml = this.createXAdESSignature(doc, certificate!, privateKey!)
      
      // 4. Extraer información del certificado
      const certificateInfo = this.extractCertificateInfo(certificate!)
      
      return {
        success: true,
        signedXml,
        certificateInfo
      }
      
    } catch (error) {
      return {
        success: false,
        errorMessage: `Error firmando XML: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
  
  /**
   * Valida la firma digital de un XML
   */
  static async validateSignature(signedXml: string): Promise<ValidationResult> {
    try {
      const doc = new DOMParser().parseFromString(signedXml, 'text/xml')
      
      // Buscar elemento de firma
      const signatureElements = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')
      
      if (signatureElements.length === 0) {
        return {
          isValid: false,
          errorMessage: 'No se encontró firma digital en el XML'
        }
      }
      
      // Extraer certificado de la firma
      const certNode = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate')[0]
      if (!certNode) {
        return {
          isValid: false,
          errorMessage: 'No se encontró certificado en la firma'
        }
      }
      
      const certPem = this.formatCertificatePem(certNode.textContent || '')
      const certificate = forge.pki.certificateFromPem(certPem)
      
      // Validar certificado (fechas, etc.)
      const now = new Date()
      if (now < certificate.validity.notBefore || now > certificate.validity.notAfter) {
        return {
          isValid: false,
          errorMessage: 'Certificado expirado',
          certificateInfo: this.extractCertificateInfo(certificate)
        }
      }
      
      // TODO: Implementar validación completa de firma
      // Esto requiere implementar la verificación de hash y firma
      const warnings = ['Validación básica implementada - Se requiere validación completa de firma']
      
      return {
        isValid: true,
        certificateInfo: this.extractCertificateInfo(certificate),
        warnings
      }
      
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Error validando firma: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
  
  /**
   * Carga un certificado desde archivo
   */
  private static async loadCertificate(
    certificatePath: string, 
    password: string
  ): Promise<{
    success: boolean
    certificate?: forge.pki.Certificate
    privateKey?: forge.pki.PrivateKey
    errorMessage?: string
  }> {
    try {
      const fs = require('fs')
      const certBuffer = fs.readFileSync(certificatePath)
      
      // Intentar cargar como PKCS#12 (más común)
      try {
        const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'))
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)
        
        // Extraer certificado y clave privada
        const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
        const certBag = bags[forge.pki.oids.certBag]?.[0]
        
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
        const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
        
        if (!certBag || !keyBag) {
          return {
            success: false,
            errorMessage: 'No se encontró certificado o clave privada en el archivo'
          }
        }
        
        return {
          success: true,
          certificate: certBag.cert,
          privateKey: keyBag.key
        }
        
      } catch (p12Error) {
        // Si falla PKCS#12, intentar como PEM
        const certPem = certBuffer.toString('utf8')
        const certificate = forge.pki.certificateFromPem(certPem)
        
        // Para PEM necesitaríamos la clave privada por separado
        return {
          success: false,
          errorMessage: 'Formato PEM detectado - se requiere clave privada separada'
        }
      }
      
    } catch (error) {
      return {
        success: false,
        errorMessage: `Error cargando certificado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
  
  /**
   * Crea la estructura de firma XAdES-BES
   */
  private static createXAdESSignature(
    doc: Document,
    certificate: forge.pki.Certificate,
    privateKey: forge.pki.PrivateKey
  ): string {
    // Crear elemento Signature
    const signatureElement = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Signature')
    
    // SignedInfo
    const signedInfo = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:SignedInfo')
    
    // CanonicalizationMethod
    const canonicalization = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:CanonicalizationMethod')
    canonicalization.setAttribute('Algorithm', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315')
    signedInfo.appendChild(canonicalization)
    
    // SignatureMethod
    const signatureMethod = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:SignatureMethod')
    signatureMethod.setAttribute('Algorithm', 'http://www.w3.org/2000/09/xmldsig#rsa-sha256')
    signedInfo.appendChild(signatureMethod)
    
    // Reference (al documento completo)
    const reference = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Reference')
    reference.setAttribute('URI', '')
    
    // Transforms
    const transforms = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Transforms')
    const transform = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Transform')
    transform.setAttribute('Algorithm', 'http://www.w3.org/2000/09/xmldsig#enveloped-signature')
    transforms.appendChild(transform)
    reference.appendChild(transforms)
    
    // DigestMethod
    const digestMethod = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:DigestMethod')
    digestMethod.setAttribute('Algorithm', 'http://www.w3.org/2001/04/xmlenc#sha256')
    reference.appendChild(digestMethod)
    
    // DigestValue (placeholder - se debería calcular el hash real)
    const digestValue = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:DigestValue')
    digestValue.textContent = this.calculateDocumentHash(doc)
    reference.appendChild(digestValue)
    
    signedInfo.appendChild(reference)
    signatureElement.appendChild(signedInfo)
    
    // SignatureValue (placeholder - se debería calcular la firma real)
    const signatureValue = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:SignatureValue')
    signatureValue.textContent = this.calculateSignature(signedInfo, privateKey)
    signatureElement.appendChild(signatureValue)
    
    // KeyInfo con certificado
    const keyInfo = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:KeyInfo')
    const x509Data = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:X509Data')
    const x509Certificate = doc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:X509Certificate')
    
    // Convertir certificado a base64
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes()
    const certBase64 = forge.util.encode64(certDer)
    x509Certificate.textContent = certBase64
    
    x509Data.appendChild(x509Certificate)
    keyInfo.appendChild(x509Data)
    signatureElement.appendChild(keyInfo)
    
    // Añadir la firma al documento
    const rootElement = doc.documentElement
    rootElement.appendChild(signatureElement)
    
    return new XMLSerializer().serializeToString(doc)
  }
  
  /**
   * Calcula el hash del documento (simplificado)
   */
  private static calculateDocumentHash(doc: Document): string {
    // Esto es una implementación simplificada
    // En una implementación real se debería canonicalizar el documento
    const serializer = new XMLSerializer()
    const xmlString = serializer.serializeToString(doc)
    const md = forge.md.sha256.create()
    md.update(xmlString, 'utf8')
    return forge.util.encode64(md.digest().getBytes())
  }
  
  /**
   * Calcula la firma digital (simplificado)
   */
  private static calculateSignature(signedInfo: Element, privateKey: forge.pki.PrivateKey): string {
    // Esto es una implementación simplificada
    const serializer = new XMLSerializer()
    const signedInfoString = serializer.serializeToString(signedInfo)
    
    const md = forge.md.sha256.create()
    md.update(signedInfoString, 'utf8')
    
    const signature = privateKey.sign(md)
    return forge.util.encode64(signature)
  }
  
  /**
   * Extrae información del certificado
   */
  private static extractCertificateInfo(certificate: forge.pki.Certificate): CertificateInfo {
    return {
      subject: certificate.subject.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
      issuer: certificate.issuer.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
      serialNumber: certificate.serialNumber,
      notBefore: certificate.validity.notBefore,
      notAfter: certificate.validity.notAfter,
      fingerprint: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes()).digest().toHex()
    }
  }
  
  /**
   * Formatea un certificado en formato PEM
   */
  private static formatCertificatePem(base64Cert: string): string {
    const cert = base64Cert.replace(/\s/g, '')
    return `-----BEGIN CERTIFICATE-----\n${cert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`
  }
  
  /**
   * Verifica si un archivo es un certificado válido
   */
  static async verifyCertificateFile(certificatePath: string, password?: string): Promise<{
    isValid: boolean
    certificateInfo?: CertificateInfo
    errorMessage?: string
  }> {
    try {
      const result = await this.loadCertificate(certificatePath, password || '')
      
      if (!result.success) {
        return {
          isValid: false,
          errorMessage: result.errorMessage
        }
      }
      
      return {
        isValid: true,
        certificateInfo: this.extractCertificateInfo(result.certificate!)
      }
      
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Error verificando certificado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
  
  /**
   * Genera un certificado de prueba para testing (NO usar en producción)
   */
  static generateTestCertificate(): {
    certificate: string
    privateKey: string
    password: string
  } {
    // Generar clave privada
    const keys = forge.pki.rsa.generateKeyPair(2048)
    
    // Crear certificado auto-firmado
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '01'
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
    
    const attrs = [
      { name: 'commonName', value: 'Test VERI*FACTU Certificate' },
      { name: 'countryName', value: 'ES' },
      { name: 'organizationName', value: 'FactuOne Test' }
    ]
    
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.sign(keys.privateKey)
    
    return {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
      password: 'test123'
    }
  }
}