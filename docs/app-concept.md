# CRM de Facturación Electrónica - Guía de Funcionamiento

## 📋 Descripción General

El **CRM de Facturación Electrónica** es una aplicación web desarrollada con Next.js 15 que permite a empresas gestionar de manera integral sus procesos de facturación, clientes, proyectos, proveedores y análisis financieros. La aplicación está diseñada específicamente para cumplir con las regulaciones de facturación electrónica en España.

---

## 🚦 Estado Actual y Mejoras Recientes

- **Gestión avanzada de proveedores:** Ahora el sistema cuenta con un módulo de proveedores ("Proveedores") completamente funcional, con experiencia de usuario y diseño idénticos al de clientes. Permite:
  - Listar, crear, editar y eliminar proveedores asociados a cada negocio.
  - Búsqueda instantánea por nombre, NIF o email.
  - Filtros por estado: Todos, Con deuda, Top proveedores, Sin facturas.
  - Ordenación por nombre, total facturado, total pendiente y número de facturas recibidas.
  - Relación directa con facturas recibidas: cada proveedor puede tener asociadas múltiples facturas recibidas, permitiendo un control total de gastos y pagos.
  - Validación de datos fiscales y de contacto.
  - Consistencia multi-empresa: cada usuario solo ve y gestiona los proveedores de su negocio activo.
  - UI profesional y responsiva, igual que el módulo de clientes.
- **Migración a UUIDs:** Toda la base de datos y el código usan identificadores UUID (`varchar(36)`) para las entidades principales, asegurando integridad referencial y consistencia entre entornos de desarrollo y producción.
- **Recreación de la base de datos:** Se eliminaron y recrearon todas las tablas en producción para garantizar la compatibilidad con el código y evitar errores de integridad.
- **Dashboard 100% funcional:** Todas las métricas clave (facturas emitidas, recibidas, proyectos, ingresos, gastos, etc.) se calculan y muestran correctamente para el negocio activo, filtradas por período si corresponde.
- **Obtención dinámica del negocio activo:** El dashboard y sus componentes obtienen el `businessId` activo desde el servidor y lo propagan a los componentes de estadísticas y gráficos, eliminando valores hardcodeados y mejorando la experiencia multi-empresa.
- **Separación profesional de responsabilidades:** Los componentes server y client están claramente diferenciados; la lógica de negocio y la obtención de datos se realiza en el servidor, mientras que la visualización y la interacción se manejan en el cliente.
- **Integridad referencial asegurada:** Todas las operaciones de creación de facturas, proyectos, clientes y proveedores funcionan correctamente, sin errores de claves foráneas.

---

## 🏗️ Arquitectura de la Aplicación

### Stack Tecnológico

- **Frontend**: Next.js 15 con React 19
- **UI Framework**: Radix UI + Tailwind CSS
- **Base de Datos**: Drizzle ORM con esquema MySQL (UUIDs como IDs)
- **Autenticación**: Sistema personalizado con bcrypt
- **Estado**: React Hooks + Server Actions
- **Iconos**: Lucide React
- **Gráficos**: Recharts
- **Formularios**: React Hook Form + Zod

### Estructura de Carpetas

```
crm-login/
├── app/                    # App Router de Next.js
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Rutas del dashboard
│   ├── api/               # API routes
│   └── db/                # Esquema de base de datos
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── layout/           # Componentes de layout
│   └── [feature]/        # Componentes específicos por feature
├── lib/                  # Utilidades y configuraciones
├── hooks/                # Custom hooks
└── public/               # Archivos estáticos
```

## 🔐 Sistema de Autenticación

### Características

- **Autenticación personalizada** sin dependencias externas
- **Middleware de protección** de rutas
- **Sesiones basadas en cookies**
- **Modo desarrollo** con bypass para facilitar pruebas

### Flujo de Autenticación

1. **Login**: Formulario con email y contraseña
2. **Verificación**: Hash de contraseña con bcrypt
3. **Sesión**: Cookie de sesión para mantener estado
4. **Middleware**: Protección automática de rutas
5. **Logout**: Limpieza de sesión

### Archivos Clave

- `middleware.ts`: Protección de rutas
- `lib/auth.ts`: Funciones de autenticación
- `app/(auth)/login/`: Páginas de autenticación

## 📊 Dashboard Principal

### Funcionalidades

- **Estadísticas en tiempo real** de ingresos, gastos, facturas emitidas, facturas recibidas, proyectos ganados, perdidos y pendientes, y balance del período.
- **Filtros por período** (mes, trimestre, año, rango personalizado).
- **Gráficos interactivos** de flujo de caja y tendencias.
- **Selector de negocio** para usuarios multi-empresa.
- **Obtención dinámica del negocio activo**: El dashboard obtiene el `businessId` activo en el server y lo pasa a los componentes de estadísticas y gráficos.
- **Integridad referencial**: Todas las métricas reflejan datos reales y consistentes del negocio activo.

### Componentes Principales

- `DashboardStats`: Tarjetas con métricas clave (ingresos, gastos, facturas emitidas/recibidas, proyectos, balance).
- `DashboardCharts`: Gráficos de flujo de caja y tendencias.
- `DashboardFilters`: Filtros de fecha y período.
- `BusinessSelector`: Selector de negocio activo.

## 🏢 Gestión de Negocios

### Características

- **Multi-empresa**: Un usuario puede gestionar múltiples negocios
- **Roles de usuario**: Admin, Contador, Usuario
- **Datos fiscales**: NIF, dirección fiscal, etc.
- **Soft delete**: Eliminación lógica de registros

### Entidades Principales

```typescript
// Negocio
type Business = {
  id: string
  name: string
  nif: string
  fiscalAddress: string
  isDeleted: boolean
}

// Usuario de Negocio
type BusinessUser = {
  userId: string
  businessId: string
  role: "admin" | "accountant" | "user"
}
```

## 👥 Gestión de Clientes

### Funcionalidades

- **CRUD completo** de clientes
- **Datos fiscales** (NIF, dirección)
- **Historial de facturas** por cliente
- **Búsqueda y filtros** avanzados
- **Validación de NIF** español

### Estructura de Datos

```typescript
type Client = {
  id: string
  businessId: string
  name: string
  nif: string
  address: string
  phone: string
  email: string
  isDeleted: boolean
}
```

## 📄 Gestión de Facturas

### Tipos de Facturas

#### Facturas Emitidas
- **Estados**: Borrador, Enviada, Pagada, Vencida, Cancelada
- **Líneas de factura** con impuestos
- **Documentos adjuntos** (PDF)
- **Seguimiento de pagos**

#### Facturas Recibidas
- **Estados**: Pendiente, Registrada, Rechazada
- **Categorización** por tipo de gasto
- **Proveedores** con datos fiscales
- **Control de gastos**

### Estructura de Datos

```typescript
type Invoice = {
  id: string
  businessId: string
  clientId: string
  date: Date
  concept: string
  total: number
  status: InvoiceStatus
  documentUrl?: string
}

type InvoiceLine = {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}
```

## 📁 Gestión de Proyectos

### Características

- **Estados**: Ganado, Perdido, Pendiente
- **Fechas de inicio y fin**
- **Contratos adjuntos**
- **Relación con clientes**
- **Métricas de éxito**

### Estructura

```typescript
type Project = {
  id: string
  businessId: string
  clientId?: string
  name: string
  status: ProjectStatus
  startDate?: Date
  endDate?: Date
  contractUrl?: string
}
```

## 📈 Análisis y Reportes

### Dashboard Analytics

- **Flujo de caja** por períodos
- **Tendencias** de ingresos y gastos
- **Métricas de proyectos** (tasa de éxito)
- **Comparativas** año anterior
- **Filtros avanzados** por fecha

### Componentes de Análisis

- `CashflowChart`: Gráfico de flujo de caja
- `AnalyticsFilters`: Filtros de análisis
- `AccountsTable`: Tabla de cuentas

## 🎨 Interfaz de Usuario

### Diseño Responsivo

- **Mobile-first** con Tailwind CSS
- **Sidebar colapsible** en móviles
- **Componentes adaptativos**
- **Tema claro/oscuro**

### Componentes UI

- **shadcn/ui**: Biblioteca de componentes base
- **Radix UI**: Componentes accesibles
- **Lucide React**: Iconografía consistente
- **Recharts**: Gráficos interactivos

### Navegación

- **Sidebar fijo** en escritorio
- **Drawer móvil** con hamburger menu
- **Breadcrumbs** para navegación
- **Búsqueda global** (futuro)

## 🔧 Configuración y Desarrollo

### Variables de Entorno

```env
# Base de datos
DATABASE_URL=mysql://user:password@localhost:3306/crm_db

# Autenticación
NEXTAUTH_SECRET=your-secret-key

# Entorno
NODE_ENV=development
```

### Scripts Disponibles

```bash
npm run dev      # Desarrollo local
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Linting
```

### Base de Datos

- **Drizzle ORM** para type-safe queries
- **MySQL** como base de datos principal
- **Migraciones** automáticas
- **Soft deletes** para integridad de datos

## 🚀 Características Avanzadas

### Multi-tenancy

- **Un usuario, múltiples negocios**
- **Aislamiento de datos** por negocio
- **Selector de contexto** activo
- **Permisos granulares** por rol

### Notificaciones

- **Sistema de notificaciones** en tiempo real
- **Notificaciones de facturas** vencidas
- **Alertas de proyectos** pendientes
- **Badges** en navegación

### Exportación de Datos

- **PDF** de facturas
- **Excel** de reportes
- **CSV** de datos
- **Backup** automático

## 🔒 Seguridad

### Medidas Implementadas

- **Hash de contraseñas** con bcrypt
- **Middleware de autenticación**
- **Validación de entrada** con Zod
- **Sanitización** de datos
- **CORS** configurado
- **Rate limiting** (futuro)

### Buenas Prácticas

- **Principio de menor privilegio**
- **Validación en frontend y backend**
- **Logs de auditoría**
- **Backup regular** de datos

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Adaptaciones

- **Sidebar colapsible** en móviles
- **Tablas scrollables** horizontalmente
- **Formularios optimizados** para touch
- **Gráficos responsivos**

## 🔄 Estado de la Aplicación

### Gestión de Estado

- **Server State**: Datos de la base de datos
- **Client State**: UI state, formularios
- **URL State**: Filtros y navegación
- **Session State**: Autenticación

### Patrones Utilizados

- **Server Actions** para mutaciones
- **React Query** para cache (futuro)
- **Context API** para tema y sidebar
- **Local Storage** para preferencias

## 🎯 Roadmap

### Próximas Funcionalidades

- [x] Migración a UUIDs y recreación de base de datos.
- [x] Dashboard funcional con métricas y filtros reales.
- [x] Integridad referencial asegurada en producción.
- [ ] Integración con bancos para conciliación.
- [ ] Facturación electrónica real con AEAT.
- [ ] API REST para integraciones.
- [ ] App móvil nativa.
- [ ] Reportes avanzados con PowerBI.
- [ ] Workflow de aprobaciones.
- [ ] Integración con CRM externos.

### Mejoras Técnicas

- [ ] **Testing** con Jest y Testing Library
- [ ] **CI/CD** con GitHub Actions
- [ ] **Docker** para deployment
- [ ] **Monitoring** con Sentry
- [ ] **Performance** optimization
- [ ] **SEO** y meta tags

## 📞 Soporte y Documentación

### Recursos Adicionales

- **Documentación de API** (futuro)
- **Guías de usuario** por módulo
- **Videos tutoriales** (futuro)
- **FAQ** y troubleshooting

### Contacto

Para soporte técnico o consultas sobre la aplicación, contactar al equipo de desarrollo.

---

*Esta documentación se actualiza regularmente. Última actualización: Diciembre 2024*

## 🏢 Gestión de Proveedores

### Funcionalidades

- **CRUD completo** de proveedores (crear, leer, actualizar, eliminar lógicamente).
- **Búsqueda instantánea** por nombre, NIF o email.
- **Filtros avanzados**: Todos, Con deuda, Top proveedores, Sin facturas.
- **Ordenación** por nombre, total facturado, total pendiente y número de facturas recibidas.
- **Relación directa con facturas recibidas**: cada proveedor puede tener asociadas múltiples facturas recibidas, permitiendo un control total de gastos y pagos.
- **Validación de datos fiscales** (NIF, dirección, email, teléfono).
- **Consistencia multi-empresa**: cada usuario solo ve y gestiona los proveedores de su negocio activo.
- **UI profesional y responsiva**, igual que el módulo de clientes.

### Estructura de Datos

```typescript
// Proveedor
export type Provider = {
  id: string
  businessId: string
  name: string
  nif: string
  address: string
  postalCode?: string
  city?: string
  country?: string
  phone: string
  email: string
  isDeleted: boolean
}

// Relación con facturas recibidas
export type ReceivedInvoice = {
  id: string
  providerId: string
  businessId: string
  number: string
  date: Date
  total: number
  status: 'pending' | 'recorded' | 'rejected' | 'paid'
  // ...otros campos
}
```

### Experiencia de Usuario

- El usuario puede gestionar proveedores con la misma experiencia visual y de interacción que el módulo de clientes.
- El buscador y los filtros permiten encontrar rápidamente cualquier proveedor.
- El sistema muestra el estado de cada proveedor (por ejemplo, "Con deuda" si tiene facturas pendientes).
- Todas las acciones son rápidas y responsivas, con validación y feedback inmediato.

---

## 🔗 Asociación de Proyectos a Facturas Emitidas y Recibidas y Filtros Avanzados

- **Asociación directa de proyectos a facturas emitidas y recibidas:**
  - Ahora es posible asociar un proyecto tanto a facturas emitidas como a facturas recibidas desde sus respectivos formularios.
  - El backend y las server actions fueron actualizados para guardar y actualizar correctamente el `projectId` en ambos tipos de factura.
  - El formulario de creación/edición de facturas permite seleccionar un proyecto asociado mediante un dropdown, mostrando solo los proyectos del negocio activo.

- **Visualización y navegación del proyecto asociado:**
  - En el detalle de cada factura (emitida o recibida), se muestra el nombre del proyecto asociado (si existe) y un enlace directo al detalle de ese proyecto.
  - El enlace permite navegar rápidamente entre facturas y proyectos relacionados, mejorando la trazabilidad y la experiencia de usuario.

- **Página de detalle de proyecto con facturas relacionadas (emitidas y recibidas):**
  - El componente avanzado de "Facturas relacionadas" en la página de cada proyecto ahora soporta tanto facturas emitidas como recibidas.
  - Incluye tabs para alternar entre ambos tipos y filtrar las facturas asociadas por **Número** y **Monto** (el filtro por Concepto está preparado para el futuro).
  - El filtro es flexible y profesional:
    - **Por número:** Coincidencia exacta, case-insensitive, con redirección directa al detalle de la factura si hay coincidencia única.
    - **Por monto:** Coincidencia parcial y flexible (soporta decimales, puntos, comas, espacios), con redirección directa si hay una sola coincidencia.
    - Si no hay coincidencia, se muestra un mensaje de "Factura no encontrada".
  - El dropdown muestra todas las facturas asociadas al proyecto y se actualiza dinámicamente según el filtro y el tipo seleccionado.
  - La experiencia visual y de usuario es unificada y profesional para ambos tipos de factura.

- **Mejoras técnicas y de UX:**
  - El componente de filtrado y dropdown fue desacoplado en un archivo cliente para evitar problemas de imports entre server/client.
  - Se agregaron logs y validaciones para asegurar la robustez de la experiencia.
  - El sistema es completamente multi-tenant: cada usuario solo ve y filtra facturas de su negocio y proyectos activos.

### Resumen de cambios técnicos

- **Base de datos:**
  - `ALTER TABLE received_invoices ADD COLUMN project_id VARCHAR(36) NULL, ADD CONSTRAINT fk_received_invoices_project FOREIGN KEY (project_id) REFERENCES projects(id);`
  - Actualización del esquema Drizzle para reflejar el nuevo campo y las relaciones.

- **Backend:**
  - Nuevas server actions para obtener facturas recibidas por proyecto y filtrar por número/monto.
  - Lógica de búsqueda flexible y case-insensitive usando SQL (`LOWER`, `CAST`, `LIKE`).

- **Frontend:**
  - Dropdown de proyectos en el formulario de facturas emitidas y recibidas.
  - Visualización del proyecto asociado en el detalle de ambas facturas.
  - Componente de tabs y dropdown para filtrar y navegar facturas (emitidas y recibidas) desde la página de proyecto.
  - Redirección automática al detalle de factura al pulsar Enter en los filtros.
  - Experiencia visual y de usuario unificada para ambos tipos de factura.

---
