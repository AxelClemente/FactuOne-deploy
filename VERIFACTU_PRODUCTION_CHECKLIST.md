# 📋 CHECKLIST PARA PRODUCCIÓN CON CERTIFICADO REAL

## ✅ CONFIGURACIÓN PREVIA

### 1. **Variables de Entorno en Vercel**
```env
ENCRYPTION_MASTER_KEY=0123456789abcdef... # Ya configurada ✅
BLOB_READ_WRITE_TOKEN=vercel_blob_... # Ya configurada ✅
```

### 2. **Certificado Digital Real**
- [ ] Certificado .p12/.pfx de FNMT-RCM o proveedor cualificado
- [ ] Contraseña del certificado
- [ ] Titular: Representante legal de la empresa
- [ ] NIF real de la empresa

## 🔍 MONITOREO EN VERCEL

### **Logs que verás en Vercel Functions:**

#### **ÉXITO ESPERADO:**
```
💰 Actualizando estado de factura: {...}
✨ VERI*FACTU: Factura marcada como pagada, creando registro...
🔥 VERI*FACTU habilitado, creando registro...
✅ Registro VERI*FACTU creado: [ID]
🔄 VERI*FACTU Worker: Procesando registro [ID]
📄 Generando XML para AEAT...
📥 Certificado descargado temporalmente: /tmp/cert_...
🔐 Firmando XML con certificado digital...
📡 Enviando a AEAT (production)...
✅ Respuesta AEAT: ÉXITO CSV12345678901234567890
```

#### **POSIBLES ERRORES Y SOLUCIONES:**

1. **Error de Certificado:**
```
❌ Error: Certificado digital inválido o expirado
Solución: Verificar validez del certificado
```

2. **Error de Contraseña:**
```
❌ Error: Contraseña incorrecta para el certificado
Solución: Verificar contraseña en tab "Certificado"
```

3. **Error de Comunicación AEAT:**
```
❌ Error: Timeout conectando con AEAT
Solución: Reintentar más tarde (AEAT puede estar saturado)
```

4. **Error de Firma:**
```
❌ Error firmando XML: Invalid certificate format
Solución: Verificar formato .p12/.pfx del certificado
```

## 🚀 PASOS PARA PRODUCCIÓN

### **1. Subir Certificado Real**
```
1. Ir a /verifactu → Tab "Certificado"
2. Subir certificado .p12 real
3. Ingresar contraseña real
4. Click "Cargar Certificado"
```

### **2. Configurar para Producción**
```
Tab "Configuración":
✅ Activar VERI*FACTU
📝 Modo: "verifactu" (automático)
🏭 Entorno: "production" ← IMPORTANTE
⏰ Segundos entre envíos: 60 (mínimo legal)
💾 Guardar configuración
```

### **3. Probar con Factura Real**
```
1. Crear factura con datos reales
2. NIF real del cliente
3. Marcar como "Pagada"
4. Verificar registro creado
```

### **4. Procesar con Worker**
```
Tab "Worker":
- Click "Procesar Cola"
- Esperar respuesta AEAT
- Verificar CSV de confirmación
```

## 📊 VERIFICACIÓN DE ÉXITO

### **En Vercel Logs:**
- ✅ CSV de confirmación: `CSV12345678901234567890`
- ✅ Estado cambia a "sent"
- ✅ Sin errores de firma o comunicación

### **En Portal AEAT:**
- QR funciona y muestra datos reales
- URL: https://www2.agenciatributaria.gob.es/es13/h/qr?...
- Datos verificables de la factura

## 🔧 COMANDOS ÚTILES EN VERCEL

### **Ver Logs en Tiempo Real:**
```bash
vercel logs --follow
```

### **Ver Logs de Función Específica:**
```bash
vercel logs api/verifactu/worker
```

### **Filtrar por Errores:**
```bash
vercel logs --filter error
```

## ⚠️ IMPORTANTE PARA PRODUCCIÓN

1. **Control de Flujo AEAT:**
   - SIEMPRE respetar 60 segundos entre envíos
   - AEAT puede bloquear por exceso de peticiones

2. **Certificados:**
   - Verificar fecha de expiración
   - Renovar antes de que caduquen
   - Guardar backup seguro

3. **Datos Reales:**
   - NIF de empresa correcto
   - NIF de clientes válidos
   - Importes exactos con IVA

4. **Monitoreo:**
   - Revisar logs diariamente
   - Configurar alertas para errores
   - Verificar CSV de confirmación

## 🆘 SOPORTE

Si algo falla en producción:
1. Revisar logs en Vercel
2. Verificar certificado y contraseña
3. Comprobar estado de servicios AEAT
4. Usar Tab "Worker" → "Reintentar Errores"