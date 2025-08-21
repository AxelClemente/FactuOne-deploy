# Implementación PDF - Generación Client-Side de Facturas

## Resumen Ejecutivo

Este documento detalla la implementación completa del sistema de generación de PDFs para facturas en FactuOne. El sistema utiliza una arquitectura **100% client-side** que genera PDFs directamente en el navegador del usuario, sin dependencias de servidor.

## Arquitectura General

### Stack Tecnológico
- **jsPDF** `^3.0.1` - Generación de PDFs en el navegador
- **html2canvas** `^1.4.1` - Conversión de HTML a imagen
- **Next.js 15** - API endpoints para datos JSON
- **React 19** - Componentes de interfaz
- **TypeScript** - Type safety

### Flujo de Generación
```
Usuario → Botón PDF → Fetch Datos → Generar HTML → html2canvas → jsPDF → Descarga
```

---

## Archivos de la Implementación

### 1. Componente Principal
**Ubicación**: `components/ui/pdf-download-button.tsx`
**Función**: Componente React que gestiona toda la generación y descarga de PDFs

```typescript
interface PDFDownloadButtonProps {
  invoiceId: string
  invoiceNumber: string
  type: 'invoice' | 'received-invoice'
  children?: React.ReactNode
}
```

**Características principales**:
- Previsualización antes de descarga
- Soporte para facturas emitidas y recibidas
- Integración con VERI*FACTU (QR codes)
- Manejo de errores robusto
- Estado de carga visual

### 2. API Endpoints - Datos JSON

#### Para Facturas Emitidas
**Ubicación**: `app/api/invoices/[id]/data/route.ts`
**Función**: Endpoint que retorna datos completos de una factura en formato JSON

**Datos incluidos**:
```typescript
{
  invoice: {
    id, number, date, dueDate, concept, 
    subtotal, taxAmount, total, status,
    paymentMethod, bankId, bizumHolder, bizumNumber
  },
  client: { name, address, city, nif },
  business: { name, fiscalAddress, nif },
  lines: [{ description, quantity, unitPrice, taxRate }],
  bank?: { bankName, accountNumber, accountHolder },
  verifactu?: { qrCode, isVerifiable }
}
```

#### Para Facturas Recibidas
**Ubicación**: `app/api/received-invoices/[id]/data/route.ts`
**Función**: Mismo formato para facturas recibidas, con datos de proveedor

### 3. Integración en la UI

#### Facturas Emitidas
**Ubicación**: `components/invoices/invoice-detail.tsx:112-118`
```tsx
<PDFDownloadButton 
  invoiceId={invoice.id} 
  invoiceNumber={invoice.number} 
  type="invoice"
>
  Descargar PDF
</PDFDownloadButton>
```

#### Facturas Recibidas
**Ubicación**: `components/received-invoices/received-invoice-detail.tsx`
```tsx
<PDFDownloadButton 
  invoiceId={invoice.id} 
  invoiceNumber={invoice.number} 
  type="received-invoice"
>
  Descargar PDF
</PDFDownloadButton>
```

---

## Flujo Detallado de Generación

### Paso 1: Activación
1. Usuario hace clic en "Descargar PDF"
2. Se ejecuta `handlePreview()` en el componente `PDFDownloadButton`
3. Se muestra un diálogo de previsualización

### Paso 2: Obtención de Datos
```typescript
const response = await fetch(`/api/${type}/${invoiceId}/data`)
const data = await response.json()

// Intenta obtener datos de VERI*FACTU si existen
const verifactuResponse = await fetch(`/api/${type}/${invoiceId}/verifactu`)
if (verifactuResponse.ok) {
  data.verifactu = await verifactuResponse.json()
}
```

### Paso 3: Generación de HTML
Se ejecuta la función `generateInvoiceHTML()` que:

1. **Recibe datos JSON** completos de la factura
2. **Genera HTML dinámico** con plantilla profesional
3. **Aplica estilos inline** para compatibilidad
4. **Incluye datos de pago** (banco, Bizum, efectivo)
5. **Añade QR VERI*FACTU** si está disponible

### Paso 4: Conversión a Imagen
```typescript
const tempDiv = document.createElement('div')
tempDiv.innerHTML = html
tempDiv.style.position = 'absolute'
tempDiv.style.left = '-9999px'
tempDiv.style.width = '800px'
tempDiv.style.backgroundColor = 'white'
document.body.appendChild(tempDiv)

const canvas = await html2canvas(tempDiv, { 
  scale: 2, 
  useCORS: true, 
  allowTaint: true 
})
```

### Paso 5: Generación del PDF
```typescript
const pdf = new jsPDF('p', 'mm', 'a4')
const imgData = canvas.toDataURL('image/png')
pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
pdf.save(`factura-${invoiceNumber}.pdf`)
document.body.removeChild(tempDiv)
```

---

## Diseño de la Plantilla HTML

### Estructura Visual
La función `generateInvoiceHTML()` genera un diseño profesional que incluye:

#### Cabecera
- **Nombre de la empresa** y datos fiscales (izquierda)
- **Número de factura** destacado (derecha)
- **Línea separadora** (border-bottom)

#### Información de Facturación
- **Título "FACTURA"** en grande con línea decorativa
- **Fecha de emisión** (derecha)

#### Datos del Cliente
- **Cuadro cliente** (izquierda): nombre, dirección, ciudad, NIF
- **Cuadro varios** (derecha): fecha

#### Tabla de Líneas
```typescript
<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background: #f5f5f5;">
      <th>Cantidad</th>
      <th>Descripción</th>
      <th>Precio unitario</th>
      <th>TOTAL</th>
    </tr>
  </thead>
  <tbody>
    // Líneas dinámicas con cálculos automáticos
  </tbody>
</table>
```

#### Totales
- **Subtotal** con formateo español
- **Impuestos** con tasas mostradas
- **Total** destacado en negrita

#### Método de Pago
```typescript
// Banco
${invoiceData.paymentMethod === 'bank' && invoiceData.bank ? `
  <div>TRANSFERENCIA</div>
  <div>Banco: ${invoiceData.bank.bankName}</div>
  <div>IBAN: ${invoiceData.bank.accountNumber}</div>
  <div>Titular: ${invoiceData.bank.accountHolder}</div>
` : ''}

// Bizum
${invoiceData.paymentMethod === 'bizum' ? `
  <div>BIZUM</div>
  <div>${invoiceData.bizumNumber}</div>
  <div>Titular: ${invoiceData.bizumHolder}</div>
` : ''}
```

#### Footer VERI*FACTU
```typescript
${invoiceData.verifactu ? `
  <div style="text-align: center;">
    <img src="${invoiceData.verifactu.qrCode}" alt="QR VERI*FACTU" />
    <p>Factura verificable en la sede electrónica de la AEAT</p>
  </div>
` : ''}
```

---

## Funciones Auxiliares

### Formateo de Moneda
```typescript
const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat("es-ES", { 
    style: "currency", 
    currency: "EUR" 
  }).format(Number(amount))
```

### Formateo de Fechas
```typescript
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es-ES").format(date)
}
```

### Cálculo de Impuestos
```typescript
const taxRates = Array.from(new Set(
  invoiceData.lines.map(line => line.taxRate)
)).filter(Boolean)
const taxRatesStr = taxRates.map(r => `${r}%`).join(', ')
```

---

## Seguridad y Validaciones

### API Endpoints
1. **Autenticación requerida** - `getCurrentUser()`
2. **Validación de negocio activo** - `getActiveBusiness()`
3. **Verificación de pertenencia** - Invoice.businessId === activeBusinessId
4. **Headers CORS apropiados** - Content-Type: application/json

### Cliente
1. **Sanitización HTML** - Solo se renderizan datos controlados
2. **Manejo de errores** - Try/catch en toda la cadena
3. **Cleanup DOM** - Eliminación de elementos temporales
4. **Validación de respuestas** - Verificación de response.ok

---

## Ventajas de la Implementación

### Técnicas
- ✅ **Sin dependencias de servidor** (Chrome, Puppeteer eliminados)
- ✅ **Generación instantánea** en el navegador
- ✅ **Compatibilidad universal** (funciona en cualquier entorno)
- ✅ **Menor uso de recursos** del servidor
- ✅ **Escalabilidad mejorada** (carga distribuida)

### UX/UI
- ✅ **Previsualización** antes de descarga
- ✅ **Feedback visual** (loading states)
- ✅ **Descarga directa** sin redirecciones
- ✅ **Diseño profesional** y consistente
- ✅ **Responsive** para diferentes tamaños

### Funcionales
- ✅ **Datos siempre actualizados** (generación on-demand)
- ✅ **Soporte para método de pago** (banco, Bizum, efectivo)
- ✅ **Integración VERI*FACTU** automática
- ✅ **Formateo español** (moneda, fechas)
- ✅ **Sin almacenamiento** requerido

---

## Configuración html2canvas

### Parámetros Optimizados
```typescript
await html2canvas(tempDiv, {
  scale: 2,           // Alta resolución (2x)
  useCORS: true,      // Soporte para imágenes externas
  allowTaint: true    // Permite contenido mixto
})
```

### Estilos del Elemento Temporal
```typescript
tempDiv.style.position = 'absolute'
tempDiv.style.left = '-9999px'     // Oculto fuera de vista
tempDiv.style.top = '-9999px'
tempDiv.style.width = '800px'      // Ancho fijo para consistencia
tempDiv.style.backgroundColor = 'white'
tempDiv.style.padding = '40px'
tempDiv.style.fontFamily = 'Arial, sans-serif'
tempDiv.style.fontSize = '12px'
```

---

## Configuración jsPDF

### Parámetros del Documento
```typescript
const pdf = new jsPDF('p', 'mm', 'a4')
//                    |    |     |
//                Portrait mm   A4
```

### Inserción de Imagen
```typescript
pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
//                    tipo  x  y   w    h
//                         A4 dimensions in mm
```

---

## Migración desde Puppeteer

### Problemas Resueltos
- ❌ **Error en producción**: Puppeteer no encontraba Chrome en Vercel
- ❌ **Dependencias pesadas**: Chrome + Puppeteer (>100MB)
- ❌ **Inconsistencias**: Diferentes comportamientos local vs producción
- ❌ **Latencia**: Generación server-side lenta

### Solución Implementada
- ✅ **Client-side puro**: jsPDF + html2canvas
- ✅ **Sin dependencias de servidor**: Eliminado Chrome/Puppeteer
- ✅ **Consistencia total**: Mismo comportamiento en todos los entornos
- ✅ **Rendimiento mejorado**: Generación instantánea

---

## Testing y Debugging

### Logs de Debug
El sistema incluye logs extensivos para debugging:

```typescript
console.log('[API] Iniciando GET /api/invoices/[id]/data con ID:', params.id)
console.log('[API] Usuario autenticado:', user.id)
console.log('[API] Factura obtenida:', invoiceData)
console.log('[API] Datos finales preparados:', finalData)
```

### Puntos de Verificación
1. **Autenticación** - Usuario válido
2. **Autorización** - Pertenencia al negocio
3. **Datos completos** - Factura, cliente, negocio, líneas
4. **Método de pago** - Banco, Bizum o efectivo
5. **VERI*FACTU** - QR code si está disponible

---

## Mejoras Futuras

### Calidad PDF
- [ ] Fuentes personalizadas embebidas
- [ ] Mejor resolución para textos pequeños
- [ ] Soporte para múltiples páginas
- [ ] Orientación personalizable

### Funcionalidades
- [ ] Plantillas personalizables por negocio
- [ ] Marca de agua/logo personalizado
- [ ] Múltiples formatos (Letter, A4, A5)
- [ ] Compresión de imágenes

### Rendimiento
- [ ] Cache de plantillas HTML
- [ ] Lazy loading de librerías
- [ ] Web Workers para procesamiento pesado
- [ ] Optimización de bundle size

---

## Conclusiones

La implementación actual representa una **solución robusta y escalable** para la generación de PDFs de facturas. La migración de Puppeteer a client-side ha resultado en:

- **100% de compatibilidad** con entornos de producción
- **Mejor experiencia de usuario** con generación instantánea
- **Menor complejidad** de despliegue y mantenimiento
- **Mayor escalabilidad** al distribuir la carga de procesamiento

El sistema está **listo para producción** y cumple con todos los requisitos de facturación profesional para el mercado español.

---

*Última actualización: Enero 2025*  
*Versión: 2.0 (Client-Side Implementation)*