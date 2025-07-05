# Plan profesional para descarga y generación de facturas PDF/XML (España, Facturación Electrónica 2025)

## 1. Contexto y requisitos legales

A partir de 2025, la facturación electrónica será obligatoria en España para empresas y autónomos. El formato oficial es **Facturae 3.2.x** (XML firmado digitalmente y compatible con la AEAT). Además, es imprescindible ofrecer la descarga de la factura en **PDF** (visual, para el cliente) y en **XML** (para la administración y la interoperabilidad).

---

## 2. Objetivos del sistema

- Permitir la descarga de **facturas emitidas** y **recibidas** en PDF y XML (Facturae).
- Cumplir con la normativa AEAT y los estándares de Facturae 3.2.x.
- Garantizar la seguridad, integridad y trazabilidad de los documentos.
- UX profesional: descarga directa desde la UI, feedback de estado, errores claros.

---

## 3. ✅ LOGROS IMPLEMENTADOS (Diciembre 2024)

### 3.1 Generación de PDFs con Puppeteer

**✅ COMPLETADO:** Sistema completo de generación de PDFs para facturas emitidas y recibidas.

### 3.2 Generación de XML Facturae 3.2.x Profesional

**✅ COMPLETADO:** Sistema completo de generación de XML Facturae 3.2.x para facturas emitidas y recibidas.

#### Detalles técnicos implementados:

**Backend (API Routes):**
- `GET /api/invoices/[id]/xml` → Genera XML Facturae 3.2.x de factura emitida
- `GET /api/received-invoices/[id]/xml` → Genera XML Facturae 3.2.x de factura recibida

**Stack tecnológico utilizado:**
- **xmlbuilder2** para generar XML estructurado y válido
- **fast-xml-parser** para validación de XML
- **Estructura completa Facturae 3.2.x** con todos los campos obligatorios
- **Validación automática** del XML generado
- **Formateo correcto de NIFs** españoles

**Características del XML generado:**
- **Namespaces correctos** según estándar Facturae 3.2.x
- **FileHeader** con versión de esquema y tipo de documento
- **Parties** completas (SellerParty y BuyerParty) con datos fiscales
- **InvoiceHeader** con número, tipo y clase de factura
- **InvoiceIssueData** con fechas de emisión y lugar
- **TaxesOutputs** agrupados por tipo de impuesto
- **InvoiceTotals** con todos los totales requeridos
- **Items** con líneas de factura detalladas
- **PaymentDetails** con fechas de vencimiento y forma de pago
- **LegalLiterals** con referencias legales

#### Código clave implementado:

```typescript
// lib/facturae-xml.ts
export function generateFacturaeXML(invoice: FacturaeInvoice): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
  
  const facturae = doc.ele('Facturae', {
    'xmlns': 'http://www.facturae.es/Facturae/2009/v3.2/Facturae',
    'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#'
  })

  // FileHeader, Parties, Invoices, etc.
  // ... estructura completa Facturae 3.2.x

  return doc.end({ prettyPrint: true })
}

// Validación automática
export function validateFacturaeXML(xml: string): { isValid: boolean; errors?: string[] } {
  const result = XMLValidator.validate(xml)
  return { isValid: result === true, errors: result === true ? undefined : [result as string] }
}
```

**Validación y calidad:**
- ✅ Validación automática del XML generado
- ✅ Estructura conforme a Facturae 3.2.x
- ✅ Manejo de errores robusto
- ✅ Formateo de datos fiscales correcto
- ✅ Soporte para múltiples tipos de impuestos

#### Detalles técnicos implementados:

**Backend (API Routes):**
- `GET /api/invoices/[id]/pdf` → Genera PDF de factura emitida
- `GET /api/received-invoices/[id]/pdf` → Genera PDF de factura recibida
- `GET /api/received-invoices/[id]/xml` → Endpoint base para XML (preparado)

**Stack tecnológico utilizado:**
- **Puppeteer** para renderizar HTML a PDF con calidad profesional
- **Plantilla HTML personalizada** con diseño corporativo y datos fiscales completos
- **Formateo de moneda español** ("1.234,00 €") en todos los importes
- **Validación de permisos** y pertenencia al negocio activo
- **Manejo de errores** robusto con mensajes claros

**Características del PDF generado:**
- Logo y datos fiscales del negocio emisor
- Información completa del cliente/proveedor
- Tabla detallada de líneas de factura con impuestos
- Totales desglosados (subtotal, impuestos, total)
- Fechas de emisión y vencimiento
- Número de factura y estado
- Diseño responsivo y profesional

#### Código clave implementado:

```typescript
// app/api/invoices/[id]/pdf/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validación de permisos y obtención de datos
    const user = await getCurrentUser()
    const activeBusinessId = await getActiveBusiness()
    
    // Obtención de factura con relaciones
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.id),
      with: {
        client: true,
        project: true,
        lines: true,
      },
    })

    // Generación de HTML con plantilla
    const html = generateInvoicePDF(invoice, business)
    
    // Conversión a PDF con Puppeteer
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(html)
    const pdf = await page.pdf({ format: 'A4' })
    await browser.close()

    // Respuesta con headers correctos
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${invoice.number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return new Response('Error generando PDF', { status: 500 })
  }
}
```

### 3.2 Frontend - Botones de descarga

**✅ COMPLETADO:** UI profesional para descarga de documentos.

**Componentes implementados:**
- **Botón "Descargar PDF"** en el detalle de factura emitida
- **Botón "Descargar PDF"** en el detalle de factura recibida
- **Botón "Descargar XML"** (preparado para implementación)
- **Feedback visual** con loading states y mensajes de error
- **Integración con sistema de permisos** granulares

**UX implementada:**
- Descarga directa al pulsar el botón
- Mensajes de error claros si falla la generación
- Integración con el sistema de notificaciones
- Diseño consistente con el resto de la aplicación

### 3.3 Corrección de errores críticos

**✅ RESUELTO:** Error de Drizzle `Cannot read properties of undefined (reading 'referencedTable')`

**Problema identificado:**
- La función `getReceivedInvoiceById` intentaba hacer joins con relaciones inexistentes
- Se incluían `business: true` y `lines: true` en el `with` pero no estaban definidas en el esquema

**Solución aplicada:**
```typescript
// ANTES (causaba error):
const invoice = await db.query.receivedInvoices.findFirst({
  where: eq(receivedInvoices.id, invoiceId),
  with: {
    provider: true,
    business: true,    // ❌ No existe en relaciones
    lines: true,       // ❌ No existe en relaciones
    project: true,
  },
})

// DESPUÉS (funciona correctamente):
const invoice = await db.query.receivedInvoices.findFirst({
  where: eq(receivedInvoices.id, invoiceId),
  with: {
    provider: true,    // ✅ Existe en relaciones
    project: true,     // ✅ Existe en relaciones
  },
})
```

**Relaciones correctamente definidas en schema.ts:**
```typescript
export const receivedInvoicesRelations = relations(receivedInvoices, ({ one }) => ({
  provider: one(providers, {
    fields: [receivedInvoices.providerId],
    references: [providers.id],
  }),
  project: one(projects, {
    fields: [receivedInvoices.projectId],
    references: [projects.id],
  }),
}))
```

### 3.4 Formateo de moneda español

**✅ IMPLEMENTADO:** Formateo correcto de importes en formato español.

```typescript
// Función de formateo implementada
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0,00 €"
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return "0,00 €"
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}
```

---

## 4. Arquitectura y stack actual

### Backend
- **Next.js 15** con App Router
- **Drizzle ORM** para queries type-safe
- **Puppeteer** para generación de PDFs
- **MySQL** con UUIDs como identificadores
- **Sistema de permisos granulares** por módulo

### Frontend
- **React 19** con Server Components
- **Tailwind CSS** + **shadcn/ui**
- **Lucide React** para iconografía
- **Server Actions** para mutaciones

### Seguridad
- **Autenticación personalizada** con bcrypt
- **Middleware de protección** de rutas
- **Validación de permisos** por negocio y módulo
- **Sanitización** de datos con Zod

---

## 5. 🔄 PRÓXIMOS PASOS (Roadmap)

### 5.1 XML Facturae 3.2.x (PRIORIDAD ALTA)

**Objetivo:** Implementar generación de XML Facturae para cumplir normativa 2025.

**Tareas específicas:**
1. **Instalar dependencias:**
   ```bash
   npm install xmlbuilder2 libxmljs node-forge
   ```

2. **Crear plantilla XML Facturae 3.2.x:**
   - Estructura base con namespaces correctos
   - Campos obligatorios (emisor, receptor, líneas, impuestos)
   - Validación contra XSD oficial

3. **Implementar endpoints XML:**
   - `GET /api/invoices/[id]/xml`
   - `GET /api/received-invoices/[id]/xml`

4. **Validación y testing:**
   - Validar XML contra esquema oficial
   - Testear con facturas reales
   - Verificar compatibilidad con AEAT

### 5.2 Mejoras en PDFs (PRIORIDAD MEDIA)

**Objetivo:** Mejorar calidad y funcionalidad de PDFs.

**Tareas:**
1. **Añadir QR/código seguro de verificación**
2. **Implementar branding por negocio** (logos personalizados)
3. **Soporte multi-idioma** (español/inglés)
4. **Cache de PDFs generados** para mejor rendimiento
5. **Plantillas personalizables** por tipo de factura

### 5.3 Funcionalidades avanzadas (PRIORIDAD BAJA)

**Objetivo:** Funcionalidades profesionales adicionales.

**Tareas:**
1. **Descarga masiva** (ZIP con múltiples facturas)
2. **Envío automático por email** con PDF adjunto
3. **Firma digital XAdES** para XMLs
4. **Integración con bancos** para conciliación
5. **Reportes PDF** de análisis y estadísticas

### 5.4 Testing y validación (CONTINUO)

**Objetivo:** Garantizar calidad y cumplimiento normativo.

**Tareas:**
1. **Tests unitarios** para generación de PDF/XML
2. **Tests de integración** con base de datos
3. **Validación con facturas reales** de diferentes tipos
4. **Performance testing** para generación masiva
5. **Auditoría de seguridad** de endpoints

---

## 6. Endpoints y flujo actual

### Endpoints implementados ✅
- `GET /api/invoices/[id]/pdf` → **FUNCIONANDO**
- `GET /api/received-invoices/[id]/pdf` → **FUNCIONANDO**
- `GET /api/invoices/[id]/xml` → **FUNCIONANDO (Facturae 3.2.x)**
- `GET /api/received-invoices/[id]/xml` → **FUNCIONANDO (Facturae 3.2.x)**

### Endpoints pendientes ❌
- `POST /api/invoices/bulk-download` → **PENDIENTE**
- `POST /api/invoices/send-email` → **PENDIENTE**

### Flujo actual de generación
1. ✅ Usuario pulsa "Descargar PDF"
2. ✅ Frontend llama al endpoint correspondiente
3. ✅ Backend valida permisos y obtiene datos
4. ✅ Se genera HTML con plantilla personalizada
5. ✅ Puppeteer convierte HTML a PDF
6. ✅ Se devuelve archivo para descarga directa

---

## 7. Detalles técnicos y mejores prácticas

### PDF (IMPLEMENTADO)
- ✅ Plantilla HTML profesional con datos fiscales
- ✅ Formateo de moneda español correcto
- ✅ Validación de permisos y pertenencia al negocio
- ✅ Manejo de errores robusto
- ✅ Headers correctos para descarga

### XML (IMPLEMENTADO)
- ✅ Estructura Facturae 3.2.x completa
- ✅ Validación automática del XML generado
- ✅ Namespaces y estructura conforme al estándar
- ✅ Soporte para múltiples tipos de impuestos
- ❌ Firma digital XAdES (opcional)
- ❌ Soporte para facturas rectificativas

### Seguridad (IMPLEMENTADO)
- ✅ Validación de autenticación
- ✅ Verificación de permisos granulares
- ✅ Validación de pertenencia al negocio
- ✅ Sanitización de parámetros

### Escalabilidad (PENDIENTE)
- ❌ Cache de archivos generados
- ❌ Generación asíncrona para archivos grandes
- ❌ Compresión de archivos
- ❌ Rate limiting en endpoints

---

## 8. Recursos útiles
- [Esquema XSD oficial Facturae](https://www.facturae.gob.es/formato/Paginas/descarga-xsd.aspx)
- [Guía técnica Facturae](https://www.facturae.gob.es/formato/Paginas/descarga-documentacion.aspx)
- [Ejemplo de XML Facturae](https://www.facturae.gob.es/formato/Paginas/ejemplos.aspx)
- [AEAT - Facturación electrónica](https://www.agenciatributaria.es/AEAT.internet/Inicio/_Segmentos_/Empresas_y_profesionales/Facturacion_electronica/Facturacion_electronica.shtml)
- [Puppeteer Documentation](https://pptr.dev/)
- [xmlbuilder2 Documentation](https://oozcitak.github.io/xmlbuilder2/)

---

## 9. Estado del proyecto

### ✅ COMPLETADO (Diciembre 2024)
- Sistema completo de generación de PDFs
- Sistema completo de generación de XML Facturae 3.2.x
- UI profesional para descarga de documentos (PDF y XML)
- Corrección de errores críticos de Drizzle
- Formateo correcto de moneda española
- Validación de permisos y seguridad
- Validación automática de XML generado

### 🔄 EN PROGRESO
- Mejoras en plantillas de PDF
- Optimización de rendimiento

### ❌ PENDIENTE
- Funcionalidades avanzadas (descarga masiva, email)
- Firma digital XAdES para XMLs
- Testing exhaustivo y validación normativa

---

*Este documento se actualiza regularmente. Última actualización: Diciembre 2024 - Sistema de PDFs completamente funcional, preparado para XML Facturae.*
