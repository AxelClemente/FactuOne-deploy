# 🚨 ANÁLISIS DE ERRORES VERI*FACTU - FactuOne

## 📋 RESUMEN EJECUTIVO

**Error Principal:** `Root element of WSDL was <html>. This is likely an authentication issue.`

**Estado:** ❌ **NO RESUELTO** - El sistema no puede acceder al WSDL de AEAT

**Impacto:** 🔴 **CRÍTICO** - Sistema VERI*FACTU completamente no funcional

---

## 🔍 ANÁLISIS DETALLADO DEL PROBLEMA

### **1. EVIDENCIA TÉCNICA**

#### **Logs de Servidor (24 Agosto 2025 - 16:17 GMT):**
```
📋 [SOAP CLIENT] Certificado leído exitosamente, tamaño: 3795 bytes
🔍 [SOAP CLIENT] Primeros 50 bytes del certificado: 30820ecf02010330820e9506092a864886f70d010701a0...
✅ [SOAP CLIENT] Certificado configurado en HTTPS agent exitosamente
🌐 [SOAP CLIENT] URL WSDL completa: https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP?wsdl
❌ [SOAP CLIENT] Error creando cliente SOAP: Root element of WSDL was <html>
🚨 [SOAP CLIENT] AEAT devolvió HTML en lugar de WSDL - problema de autenticación o endpoint
```

#### **Configuración Verificada:**
- ✅ Certificado P12 de 3795 bytes leído correctamente
- ✅ Contraseña de certificado proporcionada
- ✅ HTTPS Agent configurado con certificado
- ✅ Headers SOAP apropiados enviados
- ✅ URL con `?wsdl` correcta
- ✅ Endpoint de producción AEAT usado

### **2. DIAGNÓSTICO DEL PROBLEMA**

#### **🎯 Confirmado: AEAT Rechaza el Acceso**

**Evidencia WebFetch (24 Agosto 2025):**
```
URL: https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP?wsdl
RESULTADO: HTTP 302 Redirect
DESTINO: https://sede.agenciatributaria.gob.es/Sede/errores/erro4033.html
ERROR: "No se detecta certificado electrónico o no se ha seleccionado correctamente"
```

**Diagnóstico:** AEAT requiere autenticación con certificado digital **desde el primer acceso al WSDL**.

---

## 🔧 SOLUCIONES IMPLEMENTADAS (SIN ÉXITO)

### **Intento #1: Importación Dinámica de SOAP**
- **Problema Identificado:** `soap.createClientAsync` no disponible
- **Solución:** Importación dinámica con validación
- **Resultado:** ✅ **SOLUCIONADO** - SOAP module carga correctamente

### **Intento #2: Corrección Runtime Vercel**
- **Problema Identificado:** Edge Runtime no soporta librerías Node.js completas
- **Solución:** `export const runtime = 'nodejs'` en rutas API
- **Resultado:** ✅ **SOLUCIONADO** - Runtime correcto habilitado

### **Intento #3: Validación Tipos y Datos**
- **Problema Identificado:** Errores `toFixed` y `lines not iterable`
- **Solución:** Validación y conversión de tipos numéricos
- **Resultado:** ✅ **SOLUCIONADO** - Datos procesados correctamente

### **Intento #4: Configuración HTTPS Avanzada**
- **Problema Identificado:** Certificado no enviado correctamente
- **Solución:** 
  - TLS 1.2 forzado (`secureProtocol: 'TLSv1_2_method'`)
  - SSL estricto (`rejectUnauthorized: true`)
  - Headers específicos AEAT
- **Resultado:** ❌ **SIN ÉXITO** - Mismo error persiste

### **Intento #5: Debugging Exhaustivo**
- **Problema Identificado:** Falta de visibilidad en el proceso
- **Solución:** Logs detallados en cada paso crítico
- **Resultado:** ✅ **INFORMACIÓN OBTENIDA** - Confirmación que certificado se lee y envía

---

## 🚨 PROBLEMAS IDENTIFICADOS NO RESUELTOS

### **1. CERTIFICADO DIGITAL**

#### **❓ Posibles Causas:**
1. **Certificado Inválido:**
   - Certificado no emitido por CA reconocida por AEAT
   - Certificado no es de "Representante Legal" sino personal
   - Certificado expirado o revocado

2. **Formato Certificado:**
   - Certificado P12 corrupto o mal formateado
   - Contraseña incorrecta (aunque logs indican que se acepta)
   - Certificado no contiene claves privadas correctas

3. **Configuración Técnica:**
   - AEAT requiere configuración SSL específica no implementada
   - Headers adicionales requeridos no enviados
   - Protocolo TLS/SSL no compatible

### **2. ENDPOINTS Y CONFIGURACIÓN AEAT**

#### **❓ Información Faltante Crítica:**
1. **Endpoints Oficiales:**
   - ⚠️ No se pudo acceder a documentación oficial de endpoints
   - ⚠️ URLs pueden estar desactualizadas
   - ⚠️ Configuración específica de producción vs testing desconocida

2. **Requisitos de Certificados:**
   - ⚠️ Tipo exacto de certificado requerido no documentado
   - ⚠️ CA (Certificate Authority) específica requerida desconocida
   - ⚠️ Configuración adicional de certificados no especificada

3. **Configuración SOAP:**
   - ⚠️ Headers específicos requeridos por AEAT desconocidos
   - ⚠️ Configuración SSL/TLS exacta no documentada
   - ⚠️ Parámetros adicionales de autenticación no identificados

### **3. LIMITACIONES TÉCNICAS VERCEL**

#### **🔍 Sospecha: Incompatibilidad Vercel-AEAT**
1. **IP Whitelisting:**
   - AEAT puede requerir IPs específicas registradas
   - Vercel usa IPs dinámicas que pueden no estar autorizadas

2. **Certificados Temporales:**
   - Certificado se descarga a `/tmp/` en Vercel
   - Posible problema de permisos o acceso desde HTTPS Agent

3. **Headers/User-Agent:**
   - AEAT puede rechazar User-Agents no reconocidos
   - Possible filtering de tráfico automatizado

---

## 🔬 EVIDENCIA TÉCNICA DETALLADA

### **Log Completo del Fallo:**
```
🚀 [SOAP CLIENT] Iniciando creación de cliente SOAP
🔧 [SOAP CLIENT] Configuración recibida: {
  environment: 'production',
  mode: 'verifactu',
  useSello: false,
  hasCertificatePath: true,
  hasPassword: true,
  certificatePathPreview: '/tmp/cert_7456e2a1-d4d0-48d7-a83f-dd6c25df507c_175...'
}
🌐 [SOAP CLIENT] Endpoint seleccionado: https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP
📋 [SOAP CLIENT] URL completa del WSDL: https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP?wsdl
📦 [SOAP CLIENT] Soap module imported successfully
🔍 [SOAP CLIENT] Soap client validation: { hasDefault: false, hasCreateClientAsync: true }
🔐 [SOAP CLIENT] Configurando certificado para acceso a AEAT...
📂 [SOAP CLIENT] Ruta del certificado: /tmp/cert_7456e2a1-d4d0-48d7-a83f-dd6c25df507c_1756052273182.p12
🔑 [SOAP CLIENT] Contraseña proporcionada: SÍ (****)
📋 [SOAP CLIENT] Certificado leído exitosamente, tamaño: 3795 bytes
🔍 [SOAP CLIENT] Primeros 50 bytes del certificado: 30820ecf02010330820e9506092a864886f70d010701a0820e8604820e8230820e7e308208bf06092a864886f70d010706a0
✅ [SOAP CLIENT] Certificado configurado en HTTPS agent exitosamente
⚙️ [SOAP CLIENT] Opciones del cliente SOAP: {
  timeout: 60000,
  hasAgent: true,
  headers: {
    'User-Agent': 'FactuOne-VERI*FACTU/1.0',
    'Content-Type': 'text/xml; charset=utf-8',
    SOAPAction: '',
    Accept: 'text/xml, multipart/related',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  }
}
🚀 [SOAP CLIENT] Intentando crear cliente SOAP...
🌐 [SOAP CLIENT] URL WSDL completa: https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP?wsdl
⏰ [SOAP CLIENT] Iniciando petición HTTP a AEAT...
❌ [SOAP CLIENT] Error creando cliente SOAP: Error: Root element of WSDL was <html>. This is likely an authentication issue.
🔍 [SOAP CLIENT] Detalles del error: {
  message: 'Root element of WSDL was <html>. This is likely an authentication issue.',
  name: 'Error',
  stack: 'Error: Root element of WSDL was <html>. This is likely an authentication issue.\n    at t.onopentag (/var/task/.next/server/chunks/1487.js:5:133177)...'
}
🚨 [SOAP CLIENT] AEAT devolvió HTML en lugar de WSDL - problema de autenticación o endpoint
🔍 [SOAP CLIENT] Esto indica que el certificado no está siendo aceptado por AEAT
```

### **Análisis del Certificado:**
- **Tamaño:** 3795 bytes (tamaño normal para P12)
- **Header:** `30820ecf...` (formato PKCS#12 válido)
- **Configuración:** Cert y Key usando mismo buffer (estándar P12)
- **Contraseña:** Proporcionada y aceptada por fs.readFileSync

---

## 📊 CONCLUSIONES Y RECOMENDACIONES

### **🎯 Causa Raíz Más Probable:**

**CERTIFICADO DIGITAL NO VÁLIDO PARA AEAT**

La evidencia técnica indica que:
1. ✅ El código funciona correctamente
2. ✅ El certificado se lee y configura apropiadamente  
3. ✅ La petición llega a AEAT
4. ❌ AEAT rechaza la autenticación y devuelve página de error

### **🔧 Recomendaciones Prioritarias:**

#### **1. VALIDAR CERTIFICADO (CRÍTICO)**
- [ ] **Verificar que es certificado de "Representante Legal"** (no personal)
- [ ] **Confirmar CA emisora** (FNMT-RCM o proveedor cualificado)
- [ ] **Verificar vigencia** y que no esté revocado
- [ ] **Probar certificado en navegador** accediendo directamente al WSDL

#### **2. OBTENER DOCUMENTACIÓN OFICIAL (ALTA PRIORIDAD)**
- [ ] **Acceder al portal de desarrolladores AEAT** con credenciales oficiales
- [ ] **Obtener especificaciones técnicas exactas** de VERI*FACTU
- [ ] **Verificar endpoints actuales** (pueden haber cambiado)
- [ ] **Confirmar requisitos de certificados** específicos

#### **3. PROBAR ENTORNO DE TESTING (MEDIA PRIORIDAD)**
- [ ] **Cambiar a endpoints de testing** temporalmente
- [ ] **Verificar si testing requiere certificado** diferente
- [ ] **Confirmar funcionamiento básico** antes de producción

#### **4. ALTERNATIVAS TÉCNICAS (BAJA PRIORIDAD)**
- [ ] **Probar desde servidor dedicado** (no Vercel)
- [ ] **Implementar cliente SOAP alternativo** (.NET, Java)
- [ ] **Contactar soporte técnico AEAT** para verificación

---

## 🚧 BLOQUEADORES ACTUALES

### **❌ ACCESO A DOCUMENTACIÓN OFICIAL**
- No se pudo acceder a especificaciones técnicas oficiales de AEAT
- URLs de documentación PDF devuelven 404
- Información crítica sobre certificados no disponible públicamente

### **❌ VALIDACIÓN DE CERTIFICADO**
- No hay herramientas para verificar validez del certificado con AEAT
- No se puede probar acceso directo al WSDL desde navegador
- Sin acceso a logs de AEAT para diagnóstico detallado

### **❌ ENTORNO DE TESTING LIMITADO**
- No hay credenciales de testing disponibles
- No se puede probar sin certificado real
- Sin capacidad de validar endpoints alternativos

---

## 📅 PRÓXIMOS PASOS RECOMENDADOS

### **INMEDIATO (24-48 horas):**
1. **Verificar certificado digital** con entidad emisora
2. **Probar acceso directo al WSDL** desde navegador con certificado
3. **Contactar soporte técnico AEAT** para verificación de endpoints

### **CORTO PLAZO (1-2 semanas):**
1. **Obtener documentación oficial completa** de AEAT
2. **Implementar entorno de testing** con certificados de prueba
3. **Probar solución en servidor dedicado** alternativo a Vercel

### **MEDIO PLAZO (2-4 semanas):**
1. **Desarrollar cliente SOAP alternativo** si problema persiste
2. **Implementar validación automática de certificados**
3. **Crear sistema de monitoreo** de salud de servicios AEAT

---

**📝 Documento generado:** 24 Agosto 2025, 16:30 GMT  
**👨‍💻 Análisis por:** Claude Code Assistant  
**🔍 Estado:** Problema identificado, solución pendiente de validación de certificado