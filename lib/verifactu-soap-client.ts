import soap from 'soap'
import https from 'https'
import fs from 'fs'
import path from 'path'

/**
 * Cliente SOAP para comunicación con la AEAT - VERI*FACTU
 * 
 * Maneja la comunicación con los servicios web oficiales de la AEAT
 * para el envío y consulta de registros de facturación
 */

interface AeatEndpoints {
  verifactu: {
    testing: string
    testingSello: string
    production: string
    productionSello: string
  }
  requerimiento: {
    testing: string
    testingSello: string
    production: string
    productionSello: string
  }
}

// Endpoints oficiales de la AEAT
const AEAT_ENDPOINTS: AeatEndpoints = {
  verifactu: {
    testing: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    testingSello: 'https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    production: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    productionSello: 'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP'
  },
  requerimiento: {
    testing: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
    testingSello: 'https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
    production: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
    productionSello: 'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP'
  }
}

interface SoapClientConfig {
  environment: 'testing' | 'production'
  mode: 'verifactu' | 'requerimiento'
  useSello: boolean // Usar certificado de sello
  certificatePath?: string
  certificatePassword?: string
  timeout: number // Timeout en millisegundos
}

interface SubmitResult {
  success: boolean
  csv?: string // Código Seguro de Verificación
  errorCode?: string
  errorMessage?: string
  rawResponse?: string
}

interface QueryResult {
  success: boolean
  estado?: 'Correcto' | 'AceptadoConErrores' | 'Incorrecto'
  csv?: string
  errorCode?: string
  errorMessage?: string
  rawResponse?: string
}

/**
 * Cliente SOAP para la AEAT
 */
export class VerifactuSoapClient {
  
  /**
   * Crea un cliente SOAP configurado para la AEAT
   */
  private static async createSoapClient(config: SoapClientConfig): Promise<soap.Client> {
    const endpoint = this.getEndpoint(config)
    
    // Configuración HTTPS con certificado si es necesario
    const httpsAgent = new https.Agent({
      rejectUnauthorized: true,
      // Si tenemos certificado, configurarlo
      ...(config.certificatePath && {
        cert: fs.readFileSync(config.certificatePath),
        key: fs.readFileSync(config.certificatePath),
        passphrase: config.certificatePassword
      })
    })
    
    // Opciones del cliente SOAP
    const soapOptions = {
      timeout: config.timeout,
      agent: httpsAgent,
      // Headers adicionales para AEAT
      headers: {
        'User-Agent': 'FactuOne-VERI*FACTU/1.0',
        'Content-Type': 'text/xml; charset=utf-8'
      }
    }
    
    try {
      const client = await soap.createClientAsync(endpoint + '?wsdl', soapOptions)
      
      // Configurar security si tenemos certificado
      if (config.certificatePath) {
        const cert = fs.readFileSync(config.certificatePath)
        const key = fs.readFileSync(config.certificatePath)
        client.setSecurity(new soap.ClientSSLSecurity(key, cert, config.certificatePassword))
      }
      
      return client
    } catch (error) {
      throw new Error(`Error creando cliente SOAP: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }
  
  /**
   * Obtiene el endpoint correcto según la configuración
   */
  private static getEndpoint(config: SoapClientConfig): string {
    const endpoints = AEAT_ENDPOINTS[config.mode]
    
    if (config.environment === 'testing') {
      return config.useSello ? endpoints.testingSello : endpoints.testing
    } else {
      return config.useSello ? endpoints.productionSello : endpoints.production
    }
  }
  
  /**
   * Envía un registro de facturación a la AEAT
   */
  static async submitRegistry(
    xmlContent: string, 
    config: SoapClientConfig
  ): Promise<SubmitResult> {
    try {
      const client = await this.createSoapClient(config)
      
      // Preparar el mensaje SOAP
      const soapMessage = {
        RegFactuSistemaFacturacion: xmlContent
      }
      
      // Realizar la llamada SOAP
      const [result, rawResponse] = await client.RegFactuSistemaFacturacionAsync(soapMessage)
      
      // Procesar la respuesta
      return this.processSubmitResponse(result, rawResponse)
      
    } catch (error) {
      return {
        success: false,
        errorMessage: `Error en envío SOAP: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
  
  /**
   * Consulta el estado de un registro en la AEAT
   */
  static async queryRegistry(
    xmlContent: string,
    config: SoapClientConfig
  ): Promise<QueryResult> {
    try {
      const client = await this.createSoapClient(config)
      
      // Preparar el mensaje SOAP
      const soapMessage = {
        ConsultaFactuSistemaFacturacion: xmlContent
      }
      
      // Realizar la llamada SOAP
      const [result, rawResponse] = await client.ConsultaFactuSistemaFacturacionAsync(soapMessage)
      
      // Procesar la respuesta
      return this.processQueryResponse(result, rawResponse)
      
    } catch (error) {
      return {
        success: false,
        errorMessage: `Error en consulta SOAP: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
  
  /**
   * Procesa la respuesta de envío de registro
   */
  private static processSubmitResponse(result: any, rawResponse: string): SubmitResult {
    try {
      // La respuesta puede venir en diferentes formatos según el resultado
      const response = result?.RespuestaRegFactuSistemaFacturacion || result
      
      // Verificar si hay errores
      if (response?.EstadoEnvio === 'Incorrecto' || response?.CodigoError) {
        return {
          success: false,
          errorCode: response.CodigoError,
          errorMessage: response.DescripcionError,
          rawResponse
        }
      }
      
      // Verificar si fue aceptado
      if (response?.EstadoEnvio === 'Correcto') {
        return {
          success: true,
          csv: response.CSV,
          rawResponse
        }
      }
      
      // Estado intermedio - aceptado con errores
      if (response?.EstadoEnvio === 'AceptadoConErrores') {
        return {
          success: true,
          csv: response.CSV,
          errorMessage: response.DescripcionError,
          rawResponse
        }
      }
      
      // Si llegamos aquí, no pudimos interpretar la respuesta
      return {
        success: false,
        errorMessage: 'Respuesta no reconocida de la AEAT',
        rawResponse
      }
      
    } catch (error) {
      return {
        success: false,
        errorMessage: `Error procesando respuesta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        rawResponse
      }
    }
  }
  
  /**
   * Procesa la respuesta de consulta de registro
   */
  private static processQueryResponse(result: any, rawResponse: string): QueryResult {
    try {
      const response = result?.RespuestaConsultaFactuSistemaFacturacion || result
      
      // Verificar si hay errores
      if (response?.CodigoError) {
        return {
          success: false,
          errorCode: response.CodigoError,
          errorMessage: response.DescripcionError,
          rawResponse
        }
      }
      
      // Extraer información del estado
      return {
        success: true,
        estado: response?.EstadoRegistro,
        csv: response?.CSV,
        rawResponse
      }
      
    } catch (error) {
      return {
        success: false,
        errorMessage: `Error procesando respuesta de consulta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        rawResponse
      }
    }
  }
  
  /**
   * Realiza una prueba de conectividad con la AEAT
   */
  static async testConnection(config: SoapClientConfig): Promise<{
    success: boolean
    responseTime?: number
    errorMessage?: string
  }> {
    const startTime = Date.now()
    
    try {
      const client = await this.createSoapClient(config)
      
      // Verificar que el cliente se creó correctamente
      const services = client.describe()
      
      const responseTime = Date.now() - startTime
      
      return {
        success: Object.keys(services).length > 0,
        responseTime
      }
      
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Obtiene información sobre los servicios disponibles en el WSDL
   */
  static async getServiceInfo(config: SoapClientConfig): Promise<{
    success: boolean
    services?: string[]
    operations?: string[]
    errorMessage?: string
  }> {
    try {
      const client = await this.createSoapClient(config)
      const description = client.describe()
      
      const services = Object.keys(description)
      const operations: string[] = []
      
      // Extraer operaciones disponibles
      for (const serviceName of services) {
        const service = description[serviceName]
        for (const portName of Object.keys(service)) {
          const port = service[portName]
          operations.push(...Object.keys(port))
        }
      }
      
      return {
        success: true,
        services,
        operations: [...new Set(operations)] // Eliminar duplicados
      }
      
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}

/**
 * Factory para crear configuraciones predefinidas
 */
export class VerifactuSoapConfigFactory {
  
  /**
   * Configuración para entorno de testing
   */
  static testing(useSello: boolean = false): SoapClientConfig {
    return {
      environment: 'testing',
      mode: 'verifactu',
      useSello,
      timeout: 30000 // 30 segundos
    }
  }
  
  /**
   * Configuración para entorno de producción
   */
  static production(
    certificatePath: string, 
    certificatePassword: string,
    useSello: boolean = false
  ): SoapClientConfig {
    return {
      environment: 'production',
      mode: 'verifactu',
      useSello,
      certificatePath,
      certificatePassword,
      timeout: 60000 // 60 segundos para producción
    }
  }
  
  /**
   * Configuración para modo requerimiento
   */
  static requerimiento(
    environment: 'testing' | 'production',
    certificatePath?: string,
    certificatePassword?: string
  ): SoapClientConfig {
    return {
      environment,
      mode: 'requerimiento',
      useSello: false,
      certificatePath,
      certificatePassword,
      timeout: 30000
    }
  }
}