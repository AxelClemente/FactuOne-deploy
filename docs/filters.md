# Sistema de Filtros Reactivo del Dashboard - Documentación Técnica

## 🎯 Problema Original

El sistema de filtros del dashboard tenía un problema crítico: **los filtros predefinidos (como "Hoy", "Ayer", "Este mes", etc.) actualizaban la URL correctamente, pero los componentes `DashboardStats` y `DashboardCharts` no reaccionaban a estos cambios**, manteniendo siempre los mismos datos sin filtrar.

### Flujo Problemático Original:
1. Usuario hace clic en "Hoy" → URL cambia a `/dashboard?period=today`
2. Los componentes reciben `searchParams` pero **NO procesaban el parámetro `period`**
3. La función `getDashboardData()` solo procesaba `startDate` y `endDate`
4. Los datos permanecían sin filtrar

---

## 🔧 Solución Implementada

### **Paso 1: Extensión de la Función `getDashboardData`**

#### **Problema Identificado:**
La función `getDashboardData()` en `app/(dashboard)/dashboard/actions.ts` solo aceptaba `startDate` y `endDate`, pero no procesaba el parámetro `period`.

#### **Solución:**
```typescript
// Antes
export async function getDashboardData(
  businessId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<DashboardData>

// Después
export async function getDashboardData(
  businessId: string, 
  startDate?: Date, 
  endDate?: Date, 
  period?: string  // ← Nuevo parámetro
): Promise<DashboardData>
```

### **Paso 2: Función de Conversión de Períodos**

#### **Implementación:**
```typescript
function convertPeriodToDates(period?: string): { startDate?: Date; endDate?: Date } {
  if (!period) return {}

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case "today":
      return { startDate: today, endDate: today }
    
    case "yesterday":
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { startDate: yesterday, endDate: yesterday }
    
    case "thisMonth":
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { startDate: firstDayOfMonth, endDate: lastDayOfMonth }
    
    case "last3Months":
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { startDate: threeMonthsAgo, endDate: lastDayOfCurrentMonth }
    
    case "thisYear":
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
      const lastDayOfYear = new Date(now.getFullYear(), 11, 31)
      return { startDate: firstDayOfYear, endDate: lastDayOfYear }
    
    case "all":
      return {} // Sin filtros de fecha
    
    default:
      return {}
  }
}
```

#### **Lógica de Procesamiento:**
```typescript
// Convertir período en fechas si se proporciona
const periodDates = convertPeriodToDates(period)
const finalStartDate = startDate || periodDates.startDate
const finalEndDate = endDate || periodDates.endDate
```

### **Paso 3: Reactividad en Componentes Client**

#### **Problema Identificado:**
Los componentes `DashboardStats` y `DashboardCharts` recibían `searchParams` como props desde el Server Component padre, pero **no reaccionaban automáticamente a cambios de URL** porque los Server Components no se re-renderizan con cambios de URL.

#### **Solución Implementada:**
Convertir los componentes para usar `useSearchParams()` de Next.js, que proporciona reactividad en tiempo real a cambios de URL.

#### **Implementación en DashboardStats:**
```typescript
"use client"

import { useSearchParams } from "next/navigation"

export function DashboardStats({ businessId, searchParams: initialSearchParams }: DashboardStatsProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // ✅ SOLUCIÓN CLAVE: Usar useSearchParams para reactividad en tiempo real
  const searchParams = useSearchParams()
  const currentSearchParams = {
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    period: searchParams.get("period") || undefined,
  }

  useEffect(() => {
    async function fetchData() {
      // ... lógica de fetch
      const dashboardData = await getDashboardData(
        businessId, 
        startDate, 
        endDate, 
        currentSearchParams.period  // ← Pasar el período
      )
      setData(dashboardData)
    }

    fetchData()
  }, [businessId, currentSearchParams.startDate, currentSearchParams.endDate, currentSearchParams.period])
}
```

#### **Implementación en DashboardCharts:**
```typescript
export function DashboardCharts({ businessId, searchParams: initialSearchParams }: DashboardChartsProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ Misma solución: useSearchParams para reactividad
  const searchParams = useSearchParams()
  const currentSearchParams = {
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    period: searchParams.get("period") || undefined,
  }

  useEffect(() => {
    async function fetchData() {
      const dashboardData = await getDashboardData(
        businessId,
        currentSearchParams.startDate ? new Date(currentSearchParams.startDate) : undefined,
        currentSearchParams.endDate ? new Date(currentSearchParams.endDate) : undefined,
        currentSearchParams.period  // ← Pasar el período
      )
      setMonthlyData(dashboardData.monthlyData)
    }

    fetchData()
  }, [businessId, currentSearchParams.startDate, currentSearchParams.endDate, currentSearchParams.period])
}
```

---

## 🔄 Flujo de Funcionamiento Final

### **1. Interacción del Usuario:**
```
Usuario hace clic en "Hoy" 
    ↓
DashboardFilters.handlePredefinedFilter("today")
    ↓
updateFilters(undefined, undefined, undefined, "today")
    ↓
router.push("/dashboard?period=today")
```

### **2. Reactividad de Componentes:**
```
URL cambia a /dashboard?period=today
    ↓
useSearchParams() detecta el cambio
    ↓
currentSearchParams.period = "today"
    ↓
useEffect se ejecuta con nueva dependencia
    ↓
fetchData() se ejecuta
    ↓
getDashboardData(businessId, undefined, undefined, "today")
```

### **3. Procesamiento de Datos:**
```
getDashboardData recibe period="today"
    ↓
convertPeriodToDates("today") 
    ↓
{ startDate: today, endDate: today }
    ↓
finalStartDate = today, finalEndDate = today
    ↓
Aplicar filtros de fecha a invoices, receivedInvoices, projects
    ↓
Calcular métricas filtradas
    ↓
Retornar DashboardData con datos del día
```

### **4. Actualización de UI:**
```
DashboardData retornado
    ↓
setData(dashboardData) / setMonthlyData(dashboardData.monthlyData)
    ↓
Componentes se re-renderizan
    ↓
UI muestra datos filtrados para "Hoy"
```

---

## 🎨 Arquitectura de la Solución

### **Separación de Responsabilidades:**

1. **Server Actions** (`actions.ts`):
   - Lógica de negocio y procesamiento de datos
   - Conversión de períodos a fechas
   - Filtrado de datos por fecha

2. **Client Components** (`dashboard-stats.tsx`, `dashboard-charts.tsx`):
   - Reactividad a cambios de URL
   - Estado local y loading states
   - Llamadas a server actions

3. **URL State Management**:
   - Los filtros se almacenan en la URL
   - Permite bookmarking y navegación
   - Sincronización automática entre componentes

### **Patrones Utilizados:**

1. **Server Actions Pattern**: Lógica de negocio en el servidor
2. **Client State Pattern**: Estado de UI en el cliente
3. **URL State Pattern**: Filtros persistentes en la URL
4. **Reactive Programming**: Componentes que reaccionan a cambios de estado

---

## 🚀 Beneficios de la Solución

### **1. Reactividad Completa:**
- Los componentes reaccionan instantáneamente a cambios de filtros
- No hay necesidad de refrescar la página
- Experiencia de usuario fluida

### **2. Persistencia de Estado:**
- Los filtros se mantienen en la URL
- Permite bookmarking de vistas específicas
- Navegación con botones atrás/adelante funciona correctamente

### **3. Escalabilidad:**
- Fácil agregar nuevos períodos predefinidos
- Arquitectura preparada para filtros adicionales
- Separación clara de responsabilidades

### **4. Performance:**
- Solo se recargan los datos necesarios
- No hay re-renderizados innecesarios
- Caching automático de Next.js

---

## 🔧 Debugging y Logs

### **Logs Estratégicos Implementados:**

```typescript
// En DashboardFilters
console.log("🔄 DashboardFilters - updateFilters llamado con:", { newStartDate, newEndDate, newExactDate, period })

// En DashboardStats/DashboardCharts
console.log("🔄 Componente renderizado con:", { businessId, currentSearchParams })

// En getDashboardData
console.log("🚀 getDashboardData llamado con:", { businessId, startDate, endDate, period })
console.log("📅 Fechas finales después de procesar período:", { finalStartDate, finalEndDate })

// En convertPeriodToDates
console.log("🔄 convertPeriodToDates llamado con period:", period)
console.log("📅 convertPeriodToDates resultado:", result)
```

### **Debugging Tips:**
1. Verificar que `useSearchParams()` detecte cambios de URL
2. Confirmar que `convertPeriodToDates()` procese correctamente el período
3. Validar que los filtros de fecha se apliquen a los datos
4. Comprobar que los componentes se re-rendericen con nuevos datos

---

## 🎯 Resultado Final

### **Funcionalidades Logradas:**

✅ **Filtros Predefinidos Funcionales:**
- "Hoy" → Datos del día actual
- "Ayer" → Datos del día anterior  
- "Este mes" → Datos del mes actual
- "Últimos 3 meses" → Datos de los últimos 3 meses
- "Este año" → Datos del año actual
- "Todo" → Sin filtros de fecha

✅ **Filtros Personalizados:**
- Rango de fechas personalizado
- Fecha exacta específica

✅ **Reactividad Completa:**
- Cambios instantáneos en las métricas
- Gráficos que se actualizan automáticamente
- URL sincronizada con el estado

✅ **Experiencia de Usuario:**
- Interfaz fluida y responsiva
- Estados de loading apropiados
- Persistencia de filtros en la URL

---

## 📚 Lecciones Aprendidas

### **1. Importancia de la Reactividad:**
Los Server Components no reaccionan automáticamente a cambios de URL. Para componentes que necesitan reactividad, es crucial usar `useSearchParams()` o convertirlos a Client Components.

### **2. Separación de Responsabilidades:**
Mantener la lógica de negocio en Server Actions y la reactividad de UI en Client Components proporciona una arquitectura limpia y mantenible.

### **3. URL State Management:**
Usar la URL como fuente de verdad para el estado de filtros proporciona persistencia, bookmarking y una mejor experiencia de usuario.

### **4. Debugging Estratégico:**
Los console.logs bien posicionados son fundamentales para identificar problemas en flujos complejos de datos.

---

## 📄 Filtros de Facturas Emitidas

### 🎯 Problema Original de los Filtros de Facturas

El sistema de filtros en la página de facturas emitidas (`/invoices`) tenía múltiples problemas críticos:

1. **Dropdowns no clickeables**: Los filtros de estado y cliente usaban `Command` + `Popover` que no respondían a clicks
2. **Filtro de fechas con desfase**: Seleccionar una fecha específica mostraba facturas del día anterior debido a problemas de zona horaria
3. **Calendar component mal renderizado**: Los días de la semana aparecían desalineados y en posiciones incorrectas

### 🔧 Solución Implementada

#### **Paso 1: Reemplazo de Command + Popover por Select**

**Problema Identificado:**
Los componentes `Command` + `Popover` tenían problemas de interactividad. El CSS `cursor-default` en `CommandItem` anulaba el `cursor-pointer` y los eventos `onSelect` no se disparaban correctamente.

**Solución:**
Reemplazamos los dropdowns problemáticos con componentes `Select` nativos de shadcn/ui:

```typescript
// ❌ Antes - Command + Popover problemático
<Popover open={statusOpen} onOpenChange={setStatusOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline">
      {statusOptions.find((opt) => opt.value === status)?.label}
      <ChevronsUpDown className="ml-2 h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandList>
        <CommandGroup>
          {statusOptions.map((option) => (
            <CommandItem onSelect={() => setStatus(option.value)}>
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>

// ✅ Después - Select funcional
<Select value={status} onValueChange={setStatus}>
  <SelectTrigger className="w-full md:w-[200px]">
    <SelectValue placeholder="Estado" />
  </SelectTrigger>
  <SelectContent>
    {statusOptions.map((option) => (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Beneficios del cambio:**
- ✅ Clicks funcionan inmediatamente
- ✅ Cursor pointer automático
- ✅ Mejor accesibilidad
- ✅ Menos código y complejidad

#### **Paso 2: Corrección del Filtro de Fechas y Zona Horaria**

**Problema Identificado:**
El filtro de fechas tenía un desfase de un día debido a conversiones incorrectas entre UTC y hora local:

```typescript
// ❌ Problema: Conversión a UTC causaba desfase
startDate = new Date("2025-07-05") // Se interpretaba como UTC
// Resultado: 2025-07-04T22:00:00.000Z (desfase de 2 horas en GMT+2)
```

**Análisis del problema con logs:**
```
[PAGE] Fecha inicio string: 2025-07-05
[PAGE] Fecha inicio parseada: 2025-07-04T22:00:00.000Z  ← ❌ Desfase UTC
[ACTIONS] StartDate recibida: 2025-07-04T22:00:00.000Z
[ACTIONS] Factura F202507462: Sat Jul 05 2025 21:41:34 GMT+0200  ← Factura existe
Frontend: "No hay facturas"  ← ❌ No coincide
```

**Solución - Parsing de Fechas Locales:**

```typescript
// ✅ Frontend - invoice-filters.tsx
const updateSearchParams = () => {
  if (startDate) {
    // Usar fecha local para evitar problemas de zona horaria
    const year = startDate.getFullYear()
    const month = (startDate.getMonth() + 1).toString().padStart(2, "0")
    const day = startDate.getDate().toString().padStart(2, "0")
    current.set("startDate", `${year}-${month}-${day}`)
  }
}

// ✅ Server - page.tsx
if (resolvedSearchParams.startDate && typeof resolvedSearchParams.startDate === "string") {
  const dateStr = resolvedSearchParams.startDate
  const [year, month, day] = dateStr.split('-').map(Number)
  startDate = new Date(year, month - 1, day, 0, 0, 0, 0) // Hora local
}

// ✅ Client - invoice-list.tsx (reactividad)
const startDateStr = searchParams.get("startDate")
if (startDateStr) {
  const [year, month, day] = startDateStr.split('-').map(Number)
  startDate = new Date(year, month - 1, day, 0, 0, 0, 0) // Consistente
}
```

**Doble Problema Solucionado:**
1. **Server-side** (page.tsx): Datos iniciales con fecha correcta
2. **Client-side** (invoice-list.tsx): Reactividad con misma lógica de fechas

#### **Paso 3: Corrección del Calendar Component**

**Problema Identificado:**
El componente Calendar tenía problemas de layout y localización:
- Días de la semana desalineados
- "Lu" aparecía en el centro, otros días fuera del calendario
- `initialFocus` deprecated

**Solución - Calendar Mejorado:**

```typescript
<Calendar
  mode="range"
  numberOfMonths={1}  // ← Reducido para mejor UX móvil
  weekStartsOn={1}    // ← Lunes primero (estándar español)
  fixedWeeks          // ← Semanas consistentes
  className="rounded-md"
  classNames={{
    // ← Estilos personalizados para alineación correcta
    head_row: "flex w-full",
    head_cell: "text-muted-foreground rounded-md w-8 font-normal text-xs flex items-center justify-center",
    row: "flex w-full mt-2",
    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
    day: "h-8 w-8 p-0 font-normal hover:bg-accent rounded-md",
  }}
  labels={{
    labelWeekday: (day) => format(day, "EEEEE", { locale: es }),
  }}
  formatters={{
    formatCaption: (date) => format(date, "LLLL yyyy", { locale: es }),
    formatWeekdayName: (day) => format(day, "EEEEE", { locale: es }),
  }}
/>
```

### 🔄 Flujo de Funcionamiento de los Filtros

#### **1. Filtro por Estado/Cliente:**
```
Usuario selecciona "Pagada" en dropdown
    ↓
Select onValueChange={setStatus}
    ↓
useEffect detecta cambio en status
    ↓
updateSearchParams() 
    ↓
router.push("/invoices?status=paid")
    ↓
Page.tsx recibe searchParams.status
    ↓
getInvoicesForCurrentUser({status: "paid"})
    ↓
Facturas filtradas se muestran
```

#### **2. Filtro por Fecha:**
```
Usuario selecciona rango 05/07/2025 - 10/07/2025
    ↓
Calendar onSelect → setStartDate/setEndDate
    ↓
updateSearchParams() convierte a fecha local
    ↓
router.push("/invoices?startDate=2025-07-05&endDate=2025-07-10")
    ↓
Page.tsx parsea fechas con new Date(year, month-1, day)
    ↓
InvoiceList.tsx usa misma lógica de parsing
    ↓
Backend filtra con fecha local correcta
    ↓
Facturas del rango se muestran correctamente
```

#### **3. Filtro de Búsqueda:**
```
Usuario escribe "F202507462"
    ↓
Input onChange={setSearchTerm}
    ↓
Form onSubmit → updateSearchParams()
    ↓
router.push("/invoices?search=F202507462")
    ↓
Backend busca en number, concept, clientName
    ↓
Facturas coincidentes se muestran
```

### 🎨 Arquitectura de la Solución

#### **Separación de Responsabilidades:**

1. **Frontend Components**:
   - `invoice-filters.tsx`: UI de filtros y gestión de estado
   - `invoice-list.tsx`: Lista reactiva que responde a cambios de URL
   - `page.tsx`: Server component que carga datos iniciales

2. **Backend Actions**:
   - `actions.ts`: Lógica de filtrado en base de datos
   - Filtros por status, clientId, fechas, búsqueda de texto

3. **Estado en URL**:
   - Filtros persistentes en searchParams
   - Navegación con historial funcional
   - Bookmarkeable y compartible

#### **Patrón de Reactividad Dual:**

```typescript
// Server-side: Datos iniciales
const initialInvoices = await getInvoicesForCurrentUser({
  businessId, status, clientId, startDate, endDate, searchTerm
})

// Client-side: Reactividad a cambios
useEffect(() => {
  const loadInvoices = async () => {
    const data = await getInvoicesForCurrentUser({
      businessId, status, clientId, startDate, endDate, searchTerm
    })
    setInvoices(data)
  }
  loadInvoices()
}, [searchParams]) // Reacciona a cambios de URL
```

### 🚀 Beneficios Logrados

#### **1. Funcionalidad Completa:**
✅ **Filtro por Estado**: Draft, Sent, Paid, Overdue, Cancelled  
✅ **Filtro por Cliente**: Todos los clientes + selección específica  
✅ **Filtro por Fecha**: Rangos exactos sin desfase de zona horaria  
✅ **Búsqueda de Texto**: Por número de factura, concepto y cliente  

#### **2. Experiencia de Usuario:**
✅ **Clicks responsivos**: Todos los dropdowns funcionan inmediatamente  
✅ **Fechas exactas**: No más desfase de días  
✅ **Calendar intuitivo**: Días alineados correctamente en español  
✅ **Filtros combinables**: Múltiples filtros simultáneos  

#### **3. Arquitectura Robusta:**
✅ **Estado en URL**: Filtros persistentes y compartibles  
✅ **Reactividad dual**: Server + Client side  
✅ **Zona horaria local**: Fechas interpretadas correctamente  
✅ **Performance**: Solo datos necesarios se recargan  

### 🔧 Debugging y Logs Estratégicos

#### **Logs Implementados para Zona Horaria:**

```typescript
// Frontend - Conversión de fechas
console.log("[FILTER] StartDate to URL:", startDate, "-> string:", dateStr)

// Server - Parsing de fechas
console.log("[PAGE] Fecha inicio string:", dateStr)
console.log("[PAGE] Fecha inicio parseada:", startDate.toISOString())

// Backend - Filtrado
console.log("[ACTIONS] StartDate recibida:", startDate.toISOString())
console.log("[ACTIONS] Total facturas encontradas:", allInvoices.length)
```

#### **Debugging Tips:**
1. **Verificar zona horaria**: Las fechas deben interpretarse como hora local
2. **Validar reactividad**: `useSearchParams()` debe detectar cambios de URL
3. **Confirmar filtros**: Backend debe recibir parámetros correctos
4. **Comprobar componentes**: Ambos server y client deben usar misma lógica

### 🎯 Lecciones Aprendidas

#### **1. Problemas de Componentes UI:**
Los componentes `Command` + `Popover` pueden tener problemas de interactividad. Para dropdowns simples, `Select` es más confiable.

#### **2. Zona Horaria es Crítica:**
El parsing de fechas debe ser consistente entre frontend y backend. Usar `new Date(year, month, day)` garantiza interpretación local.

#### **3. Reactividad Dual Necesaria:**
En aplicaciones SSR, necesitas manejar tanto datos iniciales (server) como reactividad (client) con la misma lógica.

#### **4. Debugging de Fecha/Hora:**
Los logs con timestamps y zona horaria son esenciales para identificar problemas de conversión de fechas.

---

*Esta documentación se actualiza regularmente. Última actualización: Julio 2025*
