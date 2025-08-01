# >� **PLAN DE PRUEBAS REALES VERI*FACTU - FactuOne**

## =� **Resumen Ejecutivo**

Este documento detalla el plan completo para realizar **pruebas reales con AEAT** del sistema VERI*FACTU implementado en FactuOne. 

**<� Objetivo:** Validar el funcionamiento completo del sistema con datos reales antes del lanzamiento a producci�n.

**� Timeline estimado:** 10-15 d�as laborables

**=e Responsabilidades divididas:**
- **<� CLIENTE**: Gestiones legales, certificados, datos empresariales
- **=� PROGRAMADOR**: Configuraci�n t�cnica, pruebas, monitoreo

---

## <� **RESPONSABILIDADES DEL CLIENTE**

### **= 1. CERTIFICADOS DIGITALES OFICIALES**

#### **=� �Qu� debe hacer el cliente?**

**=� Obtener Certificado de Representante Legal:**
```
=� D�nde: FNMT (F�brica Nacional de Moneda y Timbre)
< URL: https://www.sede.fnmt.gob.es/certificados/persona-juridica
=� Costo: �20-50 aproximadamente
� Tiempo: 3-7 d�as laborables
=� Formato final: Archivo .p12 o .pfx + contrase�a
```

**=� Proceso paso a paso:**
1. **Acceder** a la web oficial de FNMT
2. **Seleccionar** "Certificado de Representante Persona Jur�dica"
3. **Preparar documentaci�n** requerida:
   -  DNI del representante legal
   -  Escrituras de constituci�n de la empresa
   -  Poder notarial (si el solicitante no es el administrador �nico)
   -  CIF de la empresa
4. **Completar solicitud** online
5. **Acudir presencialmente** a oficina de registro (si es primera vez)
6. **Descargar certificado** una vez aprobado
7. **Guardar archivo .p12/.pfx** y **anotar contrase�a** de forma segura

#### **� IMPORTANTE:**
```
= El certificado DEBE pertenecer al representante legal
=� Sin este certificado NO se pueden realizar pruebas reales
=� Hacer backup del archivo de certificado
= La contrase�a es CR�TICA - no se puede recuperar
```

---

### **<� 2. DATOS EMPRESARIALES VERIFICADOS**

#### **=� Informaci�n que debe proporcionar/verificar:**

** Datos de la Empresa (OBLIGATORIOS):**
```
=� Informaci�n requerida:
   NIF/CIF real y activo
   Raz�n social EXACTA (seg�n registro mercantil)
   Domicilio fiscal completo con c�digo postal
   Municipio y provincia
   Tel�fono de contacto
   Email empresarial
   Actividad econ�mica (c�digo CNAE)
```

**= Verificaci�n necesaria:**
-  **Estado tributario**: Empresa al corriente de pagos con AEAT
-  **Datos actualizados**: Informaci�n coincidente con registros oficiales
-  **Actividad activa**: Empresa operativa y facturando regularmente

---

### **=e 3. CLIENTE DE PRUEBA**

#### **=� Opciones para testing:**

**OPCI�N A - Cliente Real (Recomendado):**
```
 Usar cliente existente con su permiso
   Explicar que son pruebas t�cnicas oficiales
   Confirmar que acepta recibir facturas de prueba
   Usar importes peque�os (�10-50)
   Conservar facturas como documentos v�lidos
```

**OPCI�N B - Cliente Ficticio (Alternativa):**
```
� Crear cliente con datos v�lidos pero ficticios:
   NIF v�lido pero no asignado (calcular d�gito control)
   Raz�n social inventada pero realista
   Direcci�n existente pero gen�rica
   � NUNCA usar NIFs reales sin permiso

NIFs de prueba sugeridos:
   12345678Z (persona f�sica)
   A12345674 (sociedad an�nima)
   B12345674 (sociedad limitada)
```

---

### **< 4. ACCESO A PORTAL AEAT**

#### **=� Pasos a seguir:**

**1. Acceso al Portal de Pruebas:**
```
< URL: https://preportal.aeat.es/
= Acceso: Con certificado digital descargado
=� Objetivo: Verificar que el certificado funciona
```

**2. Activaci�n de Servicios:**
```
Dentro del portal:
   Buscar secci�n "VERI*FACTU"
   Activar servicios de testing
   Verificar que aparece la empresa registrada
   Comprobar permisos de representante legal
```

**3. Familiarizaci�n:**
```
Explorar:
   Secci�n de consulta de facturas
   Verificador de c�digos QR
   Documentaci�n t�cnica disponible
   Herramientas de testing
```

---

### **=� 5. AUTORIZACI�N INTERNA**

#### ** Permisos necesarios:**
```
El cliente debe confirmar autorizaci�n para:
    Usar certificados digitales empresariales
    Realizar pruebas con datos reales
    Enviar informaci�n a AEAT (testing)
    Generar facturas de prueba
    Usar datos de clientes (si aplica)
```

---

### **=� 6. INFORMACI�N PARA FACTURAS DE PRUEBA**

#### **=� Datos que debe proporcionar:**
```
Para crear facturas realistas:
    Productos/servicios t�picos de la empresa
    Precios habituales (importes peque�os para testing)
    Tipos de IVA aplicables (21%, 10%, 4%)
    Conceptos y descripciones reales
    Formas de pago habituales
```

**=� Ejemplo de factura de prueba:**
```
Concepto: "Consultor�a t�cnica - Testing VERI*FACTU"
Cantidad: 1
Precio unitario: �50.00
IVA: 21%
Total: �60.50
```

---

## =� **RESPONSABILIDADES DEL PROGRAMADOR**

### **=' 1. CONFIGURACI�N T�CNICA**

#### **� Entorno de Testing:**

**1. Crear Entorno Separado:**
```bash
# Crear branch espec�fico para testing
git checkout -b testing/verifactu-real-aeat
git push -u origin testing/verifactu-real-aeat

# Configurar base de datos de testing
cp .env.development .env.testing
# Editar .env.testing con datos reales proporcionados por cliente
```

**2. Configuraci�n VERI*FACTU:**
```typescript
// Configuraci�n inicial para testing real
{
  enabled: true,
  mode: "verifactu", // Empezar con modo completo
  environment: "testing", // � MUY IMPORTANTE: testing primero
  autoSubmit: true,
  includeInPdf: true,
  flowControlSeconds: 90, // Conservador para empezar
  maxRecordsPerSubmission: 1, // De uno en uno inicialmente
  
  // Certificados (cuando cliente los proporcione):
  certificatePath: "/certificates/empresa.p12",
  certificatePassword: "password-proporcionado-por-cliente"
}
```

**3. Activar Logs Detallados:**
```typescript
// A�adir logs espec�ficos para testing real
console.log('=% PRUEBAS REALES AEAT - Configuraci�n:', {
  businessNIF: businessData.nif,
  environment: config.environment,
  certificatePresent: !!config.certificatePath,
  aeatEndpoint: soapUrl
})

console.log('=� XML enviado a AEAT:', xmlContent)
console.log('=� Respuesta completa AEAT:', aeatResponse)
console.log(' Estado final registro:', registryStatus)
```

---

### **=� 2. PREPARACI�N DE DATOS**

#### **<� Configurar Empresa Real:**
```typescript
// Actualizar datos empresariales con informaci�n real del cliente
const businessData = {
  nif: "B12345678", // NIF real proporcionado por cliente
  name: "EMPRESA REAL S.L.", // Raz�n social exacta
  address: "Calle Real 123", // Direcci�n real
  postalCode: "28001", // C�digo postal real
  city: "Madrid", // Ciudad real
  province: "Madrid", // Provincia real
  phone: "+34 912 345 678", // Tel�fono real
  email: "admin@empresa.com" // Email real
}
```

#### **=e Crear Cliente de Prueba:**
```typescript
// Cliente basado en datos proporcionados por cliente
const testClient = {
  nif: "12345678Z", // NIF v�lido proporcionado/aprobado por cliente
  name: "Cliente Prueba Testing", // Nombre acordado
  address: "Avenida Testing 456", // Direcci�n de prueba
  postalCode: "28002",
  city: "Madrid",
  province: "Madrid",
  phone: "+34 612 345 678",
  email: "testing@clienteprueba.com"
}
```

---

### **= 3. GESTI�N DE CERTIFICADOS**

#### **=� Instalaci�n Segura:**
```bash
# Crear directorio seguro para certificados
mkdir -p /app/certificates
chmod 700 /app/certificates

# Copiar certificado proporcionado por cliente
cp cliente-certificado.p12 /app/certificates/empresa.p12
chmod 600 /app/certificates/empresa.p12

# Configurar variables de entorno
echo "VERIFACTU_CERT_PATH=/app/certificates/empresa.p12" >> .env.testing
echo "VERIFACTU_CERT_PASSWORD=contrase�a-del-cliente" >> .env.testing
```

#### **>� Verificaci�n de Certificado:**
```typescript
// Funci�n para verificar certificado antes de usar
async function verifyCertificate() {
  try {
    const certInfo = await VerifactuSigner.verifyCertificateFile(
      process.env.VERIFACTU_CERT_PATH,
      process.env.VERIFACTU_CERT_PASSWORD
    )
    
    console.log(' Certificado v�lido:', {
      isValid: certInfo.isValid,
      subject: certInfo.certificateInfo?.subject,
      issuer: certInfo.certificateInfo?.issuer,
      validFrom: certInfo.certificateInfo?.validFrom,
      validTo: certInfo.certificateInfo?.validTo
    })
    
    return certInfo.isValid
  } catch (error) {
    console.error('L Error verificando certificado:', error)
    return false
  }
}
```

---

### **>� 4. PLAN DE PRUEBAS T�CNICAS**

#### **FASE 1: Conectividad B�sica (D�a 1-2)**
```typescript
// Test 1: Verificar conexi�n AEAT
async function testAEATConnection() {
  console.log('= Test 1: Conectividad AEAT')
  
  try {
    const config = VerifactuSoapConfigFactory.testing()
    const result = await VerifactuSoapClient.testConnection(config)
    
    console.log(' Conexi�n AEAT:', result.success)
    console.log('� Tiempo respuesta:', result.responseTime, 'ms')
    
    return result.success
  } catch (error) {
    console.error('L Error conexi�n AEAT:', error)
    return false
  }
}

// Test 2: Verificar certificado funciona con AEAT
async function testCertificateWithAEAT() {
  console.log('= Test 2: Certificado con AEAT')
  
  try {
    const testXML = VerifactuXmlGenerator.generateTestXML(businessData.nif)
    const signedXML = await VerifactuSigner.signXML(
      testXML,
      process.env.VERIFACTU_CERT_PATH,
      process.env.VERIFACTU_CERT_PASSWORD
    )
    
    console.log(' XML firmado correctamente')
    return true
  } catch (error) {
    console.error('L Error firmando XML:', error)
    return false
  }
}
```

#### **FASE 2: Primera Factura Real (D�a 3-5)**
```typescript
// Test 3: Crear y enviar primera factura real
async function testFirstRealInvoice() {
  console.log('= Test 3: Primera factura real')
  
  // 1. Crear factura simple
  const invoiceData = {
    clientId: testClient.id,
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 d�as
    concept: "Testing VERI*FACTU - Consultor�a t�cnica",
    lines: [{
      description: "Hora de consultor�a t�cnica",
      quantity: 1,
      unitPrice: 50.00,
      taxRate: 21.00,
      total: 50.00
    }]
  }
  
  // 2. Crear factura en sistema
  const result = await createInvoice(invoiceData)
  console.log(' Factura creada:', result.invoiceId)
  
  // 3. Marcar como pagada � Trigger VERI*FACTU
  await updateInvoiceStatus(result.invoiceId, "paid")
  console.log(' Factura marcada como pagada')
  
  // 4. Procesar manualmente
  const workerResult = await VerifactuWorker.processBusinessQueue(businessId)
  console.log(' Worker result:', workerResult)
  
  // 5. Verificar estado final
  const registry = await VerifactuService.getRegistryByInvoice(result.invoiceId, 'sent')
  console.log(' Estado final:', registry.transmissionStatus)
  
  return registry.transmissionStatus === 'sent'
}
```

#### **FASE 3: Verificaci�n QR (D�a 6-7)**
```typescript
// Test 4: Verificar QR en portal AEAT
async function testQRVerification() {
  console.log('= Test 4: Verificaci�n QR')
  
  // Obtener registros enviados exitosamente
  const sentRegistries = await db
    .select()
    .from(verifactuRegistry)
    .where(
      and(
        eq(verifactuRegistry.businessId, businessId),
        eq(verifactuRegistry.transmissionStatus, 'sent')
      )
    )
    .limit(5)
  
  console.log(`= Verificando ${sentRegistries.length} c�digos QR`)
  
  for (const registry of sentRegistries) {
    console.log(`=� QR URL: ${registry.qrCode}`)
    console.log(`=� Hash: ${registry.currentHash}`)
    console.log(`=" Secuencia: ${registry.sequenceNumber}`)
    console.log('---')
    
    // TODO: El cliente debe verificar manualmente estos QR en portal AEAT
  }
  
  return true
}
```

#### **FASE 4: Pruebas de Volumen (D�a 8-10)**
```typescript
// Test 5: M�ltiples facturas con control de flujo
async function testVolumeAndFlowControl() {
  console.log('= Test 5: Volumen y control de flujo')
  
  const invoices = []
  
  // Crear 10 facturas de prueba
  for (let i = 1; i <= 10; i++) {
    const invoiceData = {
      clientId: testClient.id,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      concept: `Testing VERI*FACTU - Volumen ${i}`,
      lines: [{
        description: `Producto/servicio ${i}`,
        quantity: 1,
        unitPrice: 25.00 + i,
        taxRate: 21.00,
        total: 25.00 + i
      }]
    }
    
    const result = await createInvoice(invoiceData)
    await updateInvoiceStatus(result.invoiceId, "paid")
    invoices.push(result.invoiceId)
    
    console.log(` Factura ${i} creada: ${result.invoiceId}`)
  }
  
  // Procesar todas autom�ticamente
  console.log('=� Iniciando procesamiento autom�tico...')
  const startTime = Date.now()
  
  const workerResult = await VerifactuWorker.processBusinessQueue(businessId)
  
  const endTime = Date.now()
  const totalTime = (endTime - startTime) / 1000
  
  console.log(`� Tiempo total procesamiento: ${totalTime} segundos`)
  console.log(`=� Resultado: ${workerResult.successful} exitosas, ${workerResult.failed} fallidas`)
  
  // Verificar que respet� control de flujo (90 segundos configurados)
  const expectedMinTime = 9 * 90 // 9 env�os con 90s entre cada uno
  console.log(`� Tiempo m�nimo esperado: ${expectedMinTime} segundos`)
  console.log(` Control de flujo respetado: ${totalTime >= expectedMinTime}`)
  
  return workerResult.successful >= 8 // Al menos 80% exitosas
}
```

---

### **=� 5. MONITOREO Y LOGS**

#### **=� Sistema de Logging:**
```typescript
// Configurar logging detallado para testing
const testLogger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] 9 ${message}`, data || '')
  },
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] L ${message}`, error || '')
  },
  success: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}]  ${message}`, data || '')
  }
}

// Usar en todas las operaciones VERI*FACTU
testLogger.info('Iniciando pruebas reales VERI*FACTU')
testLogger.success('Certificado cargado correctamente')
testLogger.error('Error enviando a AEAT', aeatError)
```

#### **=� M�tricas a Monitorear:**
```typescript
// M�tricas importantes durante testing
const testMetrics = {
  totalFacturasCreadas: 0,
  totalEnviosAEAT: 0,
  enviosExitosos: 0,
  erroresAEAT: 0,
  tiempoPromedioEnvio: 0,
  qrVerificados: 0,
  problemasDetectados: []
}

// Actualizar m�tricas despu�s de cada test
function updateTestMetrics(result: TestResult) {
  testMetrics.totalEnviosAEAT++
  
  if (result.success) {
    testMetrics.enviosExitosos++
  } else {
    testMetrics.erroresAEAT++
    testMetrics.problemasDetectados.push(result.error)
  }
  
  console.log('=� M�tricas actuales:', testMetrics)
}
```

---

### **=' 6. HERRAMIENTAS DE DEBUGGING**

#### **=� Funciones de Utilidad:**
```typescript
// Herramientas para debugging durante testing
export class TestingUtils {
  
  // Validar XML contra esquemas AEAT
  static async validateXMLStructure(xmlContent: string): Promise<ValidationResult> {
    const validation = VerifactuXmlGenerator.validateXML(xmlContent)
    console.log('= Validaci�n XML:', validation)
    return validation
  }
  
  // Simular respuesta AEAT para debugging
  static generateMockAEATResponse(success: boolean = true): AEATResponse {
    return {
      success,
      csv: success ? `CSV${Date.now()}` : undefined,
      errorCode: success ? undefined : 'TEST_ERROR',
      errorMessage: success ? undefined : 'Error simulado para testing'
    }
  }
  
  // Generar reporte completo de estado
  static async generateTestReport(businessId: string): Promise<TestReport> {
    const registries = await db
      .select()
      .from(verifactuRegistry)
      .where(eq(verifactuRegistry.businessId, businessId))
    
    const stats = {
      total: registries.length,
      pending: registries.filter(r => r.transmissionStatus === 'pending').length,
      sent: registries.filter(r => r.transmissionStatus === 'sent').length,
      error: registries.filter(r => r.transmissionStatus === 'error').length,
      lastHash: registries[registries.length - 1]?.currentHash
    }
    
    console.log('=� Reporte completo testing:', stats)
    return stats
  }
}
```

---

## =� **CRONOGRAMA DETALLADO**

### **SEMANA 1: Preparaci�n (Cliente + Programador)**

#### **D�A 1-3: Gestiones del Cliente**
```
<� CLIENTE:
   Solicitar certificado digital FNMT
   Recopilar datos empresariales verificados
   Definir cliente de prueba
   Acceder a portal AEAT de pruebas

=� PROGRAMADOR:
   Crear entorno de testing
   Configurar logging detallado
   Preparar herramientas de debugging
   Documentar procedimientos
```

#### **D�A 4-5: Instalaci�n y Configuraci�n**
```
<� CLIENTE:
   Descargar certificado digital
   Proporcionar datos reales al programador
   Verificar acceso portal AEAT
   Autorizar inicio de pruebas

=� PROGRAMADOR:
   Instalar certificado proporcionado
   Configurar datos empresariales reales
   Verificar conectividad AEAT
   Crear cliente de prueba
```

### **SEMANA 2: Pruebas T�cnicas (Principalmente Programador)**

#### **D�A 6-7: Pruebas B�sicas**
```
=� PROGRAMADOR:
   Test conectividad AEAT
   Verificar certificado con AEAT
   Primera factura real enviada
   Verificar respuesta exitosa

<� CLIENTE:
   Monitorear resultados
   Verificar QR en portal AEAT
   Reportar cualquier problema
```

#### **D�A 8-10: Pruebas Avanzadas**
```
=� PROGRAMADOR:
   M�ltiples facturas con diferentes IVAs
   Pruebas de volumen (10+ facturas)
   Verificar control de flujo
   Validar cadena de hash
   Generar reporte final

<� CLIENTE:
   Verificar m�ltiples QR en portal AEAT
   Revisar facturas recibidas
   Validar datos mostrados en portal
   Aprobar resultados finales
```

---

##  **CRITERIOS DE �XITO**

### **<� Objetivos M�nimos (CR�TICOS):**
```
 Al menos 5 facturas enviadas exitosamente a AEAT
 C�digos QR verificables en portal AEAT oficial
 Respuestas CSV de confirmaci�n recibidas
 Cadena de hash �ntegra y secuencial
 Control de flujo 60s respetado correctamente
 Sin errores cr�ticos de certificados o XML
```

### **=� Objetivos Deseables (IDEALES):**
```
<� 95%+ de facturas enviadas exitosamente
<� Tiempo promedio de env�o < 5 segundos
<� Worker autom�tico funcionando sin intervenci�n
<� Todos los QR verificables instant�neamente
<� Cero problemas de conectividad AEAT
<� Logs limpios sin errores de configuraci�n
```

---

## =� **PROBLEMAS ESPERADOS Y SOLUCIONES**

### **L Errores T�picos del Cliente:**

#### **= Certificado Digital**
```
Problema: "Certificado no v�lido"
   Verificar fecha de validez
   Comprobar NIF asociado correcto
   Revisar contrase�a exacta
   Re-descargar si es necesario

Problema: "No puedo acceder a portal AEAT"
   Verificar certificado instalado en navegador
   Probar con diferentes navegadores
   Limpiar cach� y cookies
   Contactar soporte FNMT si persiste
```

#### **=� Datos Empresariales**
```
Problema: "AEAT rechaza datos empresa"
   Verificar NIF exacto (sin espacios/guiones)
   Comprobar raz�n social literal del registro
   Actualizar domicilio fiscal si cambi�
   Verificar estado tributario corriente
```

### **L Errores T�picos del Programador:**

#### **� Configuraci�n T�cnica**
```
Problema: "No conecta con AEAT"
   Verificar URLs testing (no producci�n)
   Comprobar firewall permite puerto 443
   Revisar certificados SSL del servidor
   Validar formato de petici�n SOAP

Problema: "XML rechazado por AEAT"
   Validar contra esquemas XSD oficiales
   Verificar codificaci�n UTF-8
   Comprobar formato fechas ISO
   Revisar caracteres especiales (�, acentos)
```

#### **= Control de Flujo**
```
Problema: "Demasiadas peticiones"
   Aumentar flowControlSeconds a 120
   Verificar un solo worker corriendo
   Comprobar timestamps entre env�os
   Reducir lotes a 1 registro por vez
```

---

## =� **REPORTES Y DOCUMENTACI�N**

### **=� Informe Diario (Programador � Cliente):**
```
REPORTE D�A X - PRUEBAS VERI*FACTU
=====================================

= PRUEBAS REALIZADAS:
   Facturas creadas: X
   Env�os a AEAT: X
   �xitos: X (X%)
   Errores: X

 LOGROS:
   [Describir �xitos del d�a]
   [Problemas resueltos]
   [Funcionalidades validadas]

L PROBLEMAS DETECTADOS:
   [Listar problemas encontrados]
   [Soluciones aplicadas]
   [Pendientes para ma�ana]

=� M�TRICAS:
   Tiempo promedio env�o: X segundos
   QR verificados: X/X
   Estado general:  VERDE / � AMARILLO / L ROJO

= PLAN MA�ANA:
   [Objetivos espec�ficos]
   [Pruebas pendientes]
   [Acciones requeridas del cliente]
```

### **=� Informe Final (Ambos):**
```
INFORME FINAL - PRUEBAS REALES VERI*FACTU
=========================================

<� RESUMEN EJECUTIVO:
   Duraci�n total: X d�as
   Facturas procesadas: X
   Tasa de �xito: X%
   Estado final:  APTO PARA PRODUCCI�N

 FUNCIONALIDADES VALIDADAS:
   Generaci�n autom�tica registros VERI*FACTU
   C�lculo correcto hash SHA-256
   Env�o exitoso a AEAT testing
   Recepci�n CSV confirmaci�n
   Generaci�n QR verificables
   Control de flujo 60s
   Worker autom�tico funcional
   Interfaz usuario completa

=� ESTAD�STICAS FINALES:
   Total facturas: X
   Enviadas exitosamente: X (X%)
   Con errores: X (X%)
   QR verificados: X/X (100%)
   Tiempo promedio env�o: X segundos
   Problemas cr�ticos: 0

=� RECOMENDACIONES:
   Sistema LISTO para producci�n
   Configurar certificados producci�n
   Activar monitoreo autom�tico
   Planificar migraci�n clientes

= PR�XIMOS PASOS:
1. Obtener certificados producci�n
2. Configurar entorno producci�n
3. Migrar 2-3 clientes piloto
4. Monitorear primeras semanas
5. Rollout completo

=e RESPONSABLES PR�XIMAS FASES:
   Cliente: Certificados producci�n + clientes piloto
   Programador: Configuraci�n producci�n + monitoreo
   Ambos: Seguimiento y soporte inicial
```

---

## <� **CONCLUSI�N**

### ** Este Plan Garantiza:**
- = **Validaci�n completa** del sistema VERI*FACTU con datos reales
- =� **Divisi�n clara** de responsabilidades cliente/programador
- � **Timeline realista** y bien estructurado
- =� **Herramientas** completas para debugging y monitoreo
- =� **Reportes** detallados del progreso y resultados
- =� **Preparaci�n total** para lanzamiento a producci�n

### **<� Resultado Esperado:**
Al completar este plan, tendr�s un sistema VERI*FACTU **100% validado con AEAT** y **listo para ofrecer a clientes reales** con total confianza.

---

*Documento creado: 31 Enero 2025*  
*V�lido para: FactuOne VERI*FACTU Testing*  
*Versi�n: 1.0*

---

**=� �LISTOS PARA COMENZAR LAS PRUEBAS REALES!** =�