import https from 'https'
import fs from 'fs'
import path from 'path'
// Nota: soap se importa dinámicamente en createSoapClient() para evitar problemas de ES modules

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

// Endpoints oficiales de la AEAT - ACTUALIZADOS SEGÚN WSDL OFICIAL
const AEAT_ENDPOINTS: AeatEndpoints = {
  verifactu: {
    // NOTA: Para testing inicial usamos producción con certificado real
    testing: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    testingSello: 'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    production: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    productionSello: 'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP'
  },
  requerimiento: {
    testing: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
    testingSello: 'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/RequerimientoSOAP',
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
  private static async createSoapClient(config: SoapClientConfig): Promise<any> {
    console.log('🚀 [SOAP CLIENT] Iniciando creación de cliente SOAP')
    console.log('🔧 [SOAP CLIENT] Configuración recibida:', {
      environment: config.environment,
      mode: config.mode,
      useSello: config.useSello,
      hasCertificatePath: !!config.certificatePath,
      hasPassword: !!config.certificatePassword,
      certificatePathPreview: config.certificatePath?.substring(0, 50) + '...'
    })
    
    const endpoint = this.getEndpoint(config)
    console.log('🌐 [SOAP CLIENT] Endpoint seleccionado:', endpoint)
    console.log('📋 [SOAP CLIENT] URL completa del WSDL:', endpoint + '?wsdl')
    
    // Importación dinámica de soap para evitar problemas de ES modules
    let soapModule: any
    try {
      soapModule = await import('soap')
      console.log('📦 [SOAP CLIENT] Soap module imported successfully')
    } catch (error) {
      console.error('❌ [SOAP CLIENT] Error importing soap:', error)
      throw new Error('Failed to import soap library')
    }
    
    // Intentar diferentes formas de acceder a soap
    const soapClient = soapModule.default || soapModule
    console.log('🔍 [SOAP CLIENT] Soap client validation:', { 
      hasDefault: !!soapModule.default,
      hasCreateClientAsync: typeof soapClient.createClientAsync === 'function'
    })
    
    if (!soapClient || typeof soapClient.createClientAsync !== 'function') {
      throw new Error('soap.createClientAsync is not available - soap module not properly loaded')
    }
    
    // Configuración HTTPS con certificado si es necesario
    let httpsAgent: https.Agent
    
    if (config.certificatePath && config.certificatePassword) {
      console.log('🔐 [SOAP CLIENT] Configurando certificado para acceso a AEAT...')
      console.log('📂 [SOAP CLIENT] Ruta del certificado:', config.certificatePath)
      console.log('🔑 [SOAP CLIENT] Contraseña proporcionada:', config.certificatePassword ? 'SÍ (****)' : 'NO')
      
      try {
        const certBuffer = fs.readFileSync(config.certificatePath)
        console.log('📋 [SOAP CLIENT] Certificado leído exitosamente, tamaño:', certBuffer.length, 'bytes')
        console.log('🔍 [SOAP CLIENT] Primeros 50 bytes del certificado:', certBuffer.toString('hex').substring(0, 100))
        
        // Validar que es un archivo P12 válido
        const isValidP12 = certBuffer.length > 0 && certBuffer[0] === 0x30
        console.log('🔐 [SOAP CLIENT] Validación P12:', isValidP12 ? '✅ Formato P12 válido' : '❌ Formato P12 inválido')
        
        httpsAgent = new https.Agent({
          cert: certBuffer,
          key: certBuffer,
          passphrase: config.certificatePassword,
          // Configuración específica para AEAT
          rejectUnauthorized: true, // AEAT requiere validación SSL estricta
          secureProtocol: 'TLSv1_2_method', // AEAT puede requerir TLS 1.2+
          keepAlive: true,
          maxSockets: 5
        })
        console.log('✅ [SOAP CLIENT] Certificado configurado en HTTPS agent exitosamente')
      } catch (certError) {
        console.error('❌ [SOAP CLIENT] Error leyendo certificado:', certError)
        throw new Error(`Error loading certificate: ${certError instanceof Error ? certError.message : 'Unknown error'}`)
      }
    } else {
      console.log('⚠️ [SOAP CLIENT] No hay certificado configurado - usando configuración básica')
      console.log('🔍 [SOAP CLIENT] Debug certificado:', {
        certificatePath: config.certificatePath,
        certificatePassword: config.certificatePassword
      })
      httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true
      })
    }
    
    // Opciones del cliente SOAP - CONFIGURACIÓN CORREGIDA según recomendaciones AEAT
    const soapOptions = {
      timeout: config.timeout || 30000,
      // CRÍTICO: usar wsdl_options.agent para autenticación de certificado en WSDL
      wsdl_options: {
        agent: httpsAgent,
        headers: {
          'User-Agent': 'FactuOne-VERI*FACTU/1.0'
        }
      },
      // Headers específicos para AEAT
      headers: {
        'User-Agent': 'FactuOne-VERI*FACTU/1.0',
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '', // AEAT puede requerir SOAPAction vacío
        'Accept': 'text/xml, multipart/related',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Configuración adicional para WSDL con autenticación
      wsdl_headers: {
        'User-Agent': 'FactuOne-VERI*FACTU/1.0'
      },
      // Forzar parseo estricto del WSDL
      strict: true,
      // Configuración de codificación
      encoding: 'utf8'
    }
    
    console.log('⚙️ [SOAP CLIENT] Opciones del cliente SOAP:', {
      timeout: soapOptions.timeout,
      hasWsdlAgent: !!soapOptions.wsdl_options?.agent,
      headers: soapOptions.headers,
      wsdl_options: soapOptions.wsdl_options
    })
    
    try {
      console.log('🚀 [SOAP CLIENT] Intentando crear cliente SOAP...')
      console.log('🌐 [SOAP CLIENT] URL WSDL completa:', endpoint + '?wsdl')
      console.log('⏰ [SOAP CLIENT] Iniciando petición HTTP a AEAT...')
      
      const client = await soapClient.createClientAsync(endpoint + '?wsdl', soapOptions)
      
      console.log('✅ [SOAP CLIENT] Cliente SOAP creado exitosamente!')
      console.log('🔍 [SOAP CLIENT] Descripción del cliente:', Object.keys(client.describe()))
      
      // Configurar security si tenemos certificado
      if (config.certificatePath) {
        const cert = fs.readFileSync(config.certificatePath)
        const key = fs.readFileSync(config.certificatePath)
        client.setSecurity(new soapClient.ClientSSLSecurity(key, cert, config.certificatePassword))
      }
      
      return client
    } catch (error) {
      console.error('❌ [SOAP CLIENT] Error creando cliente SOAP:', error)
      console.error('🔍 [SOAP CLIENT] Detalles del error:', {
        message: error instanceof Error ? error.message : 'Error desconocido',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack trace'
      })
      
      // Si el error contiene información sobre HTML, significa que AEAT devolvió una página de error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      if (errorMessage.includes('Root element of WSDL was <html>')) {
        console.error('🚨 [SOAP CLIENT] AEAT devolvió HTML en lugar de WSDL - problema de autenticación o endpoint')
        console.error('🔍 [SOAP CLIENT] Esto indica que el certificado no está siendo aceptado por AEAT')
      }
      
      throw new Error(`Error creando cliente SOAP: ${errorMessage}`)
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
      console.log('🚀 [VERIFACTU] ========== INICIO ENVÍO A AEAT ==========')
      console.log('🌐 [VERIFACTU] Entorno:', config.environment)
      console.log('🎯 [VERIFACTU] Modo:', config.mode)
      console.log('🔐 [VERIFACTU] Usando certificado sello:', config.useSello)
      console.log('📄 [VERIFACTU] XML a enviar (primeros 500 chars):', xmlContent.substring(0, 500) + '...')
      
      const client = await this.createSoapClient(config)
      console.log('✅ [VERIFACTU] Cliente SOAP creado exitosamente')
      
      // Preparar el mensaje SOAP
      const soapMessage = {
        RegFactuSistemaFacturacion: xmlContent
      }
      console.log('📦 [VERIFACTU] Mensaje SOAP preparado')
      console.log('🔍 [VERIFACTU] Estructura mensaje SOAP:', JSON.stringify(Object.keys(soapMessage), null, 2))
      
      console.log('📡 [VERIFACTU] Enviando solicitud a AEAT...')
      const startTime = Date.now()
      
      // Realizar la llamada SOAP
      const [result, rawResponse] = await client.RegFactuSistemaFacturacionAsync(soapMessage)
      
      const endTime = Date.now()
      console.log(`⏱️ [VERIFACTU] Respuesta recibida en ${endTime - startTime}ms`)
      console.log('📥 [VERIFACTU] Raw Response recibida:', JSON.stringify(rawResponse, null, 2))
      console.log('📋 [VERIFACTU] Result procesado:', JSON.stringify(result, null, 2))
      
      // Procesar la respuesta
      console.log('🔄 [VERIFACTU] Procesando respuesta AEAT...')
      const processedResult = this.processSubmitResponse(result, rawResponse)
      console.log('✅ [VERIFACTU] Resultado final procesado:', JSON.stringify(processedResult, null, 2))
      console.log('🏁 [VERIFACTU] ========== FIN ENVÍO A AEAT ==========')
      
      return processedResult
      
    } catch (error) {
      console.error('❌ [VERIFACTU] ERROR CRÍTICO EN ENVÍO:', error)
      console.error('🔍 [VERIFACTU] Stack trace:', error instanceof Error ? error.stack : 'No stack available')
      console.log('🚨 [VERIFACTU] ========== ERROR EN ENVÍO A AEAT ==========')
      
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
      console.log('🔍 [VERIFACTU] Procesando respuesta AEAT...')
      console.log('📋 [VERIFACTU] Result recibido:', JSON.stringify(result, null, 2))
      console.log('📄 [VERIFACTU] RawResponse recibido:', rawResponse)
      
      // La respuesta puede venir en diferentes formatos según el resultado
      const response = result?.RespuestaRegFactuSistemaFacturacion || result
      console.log('🎯 [VERIFACTU] Response extraída:', JSON.stringify(response, null, 2))
      console.log('📊 [VERIFACTU] Estado de envío detectado:', response?.EstadoEnvio)
      
      // Verificar si hay errores
      if (response?.EstadoEnvio === 'Incorrecto' || response?.CodigoError) {
        console.log('❌ [VERIFACTU] RESPUESTA DE ERROR DE AEAT:')
        console.log('🚫 [VERIFACTU] - Código error:', response.CodigoError)
        console.log('📝 [VERIFACTU] - Descripción error:', response.DescripcionError)
        console.log('📋 [VERIFACTU] - Estado envío:', response?.EstadoEnvio)
        
        return {
          success: false,
          errorCode: response.CodigoError,
          errorMessage: response.DescripcionError,
          rawResponse
        }
      }
      
      // Verificar si fue aceptado
      if (response?.EstadoEnvio === 'Correcto') {
        console.log('✅ [VERIFACTU] RESPUESTA EXITOSA DE AEAT:')
        console.log('🎉 [VERIFACTU] - Estado: Correcto')
        console.log('🔖 [VERIFACTU] - CSV recibido:', response.CSV)
        console.log('📄 [VERIFACTU] - Response completa:', JSON.stringify(response, null, 2))
        
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