# UNIT-TEST.md

Documentación completa del sistema de testing unitario para FactuOne, una aplicación SaaS multitenant de facturación electrónica.

## 📋 Índice

- [Visión General](#visión-general)
- [Instalación y Configuración](#instalación-y-configuración)
- [Estructura de Archivos](#estructura-de-archivos)
- [Tipos de Tests Implementados](#tipos-de-tests-implementados)
- [Comandos de Testing](#comandos-de-testing)
- [Áreas Críticas Cubiertas](#áreas-críticas-cubiertas)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Mejores Prácticas](#mejores-prácticas)
- [Troubleshooting](#troubleshooting)
- [Métricas y Cobertura](#métricas-y-cobertura)

## 🎯 Visión General

Este sistema de testing unitario está diseñado específicamente para **aplicaciones multitenant** que manejan **información financiera crítica**. Los tests garantizan:

### ✅ Objetivos Principales
- **Prevenir regresiones** en funcionalidades críticas
- **Garantizar seguridad** en operaciones financieras
- **Asegurar aislamiento** multitenant correcto
- **Validar integridad** de datos financieros
- **Facilitar refactoring** con confianza

### 🔧 Stack Tecnológico
- **Jest 30.x** - Framework de testing principal
- **Testing Library** - Testing de componentes React
- **Better SQLite3** - Base de datos en memoria para tests
- **TypeScript** - Tipado estático completo
- **Next.js 15** - Framework de aplicación

## 🚀 Instalación y Configuración

### Dependencias Instaladas
```bash
npm install --save-dev \
  jest \
  @types/jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  better-sqlite3 \
  @types/better-sqlite3 \
  ts-jest
```

### Archivos de Configuración

#### `jest.config.js`
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  
  // Umbrales de cobertura por área crítica
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
    './lib/verifactu-*.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
    './lib/auth.ts': { branches: 85, functions: 85, lines: 85, statements: 85 },
    './app/**/actions.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
}

module.exports = createJestConfig(config)
```

#### `jest.setup.js`
```javascript
import '@testing-library/jest-dom'

// Configuración global de tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:./test.db'

// Mocks globales
global.fetch = jest.fn()
global.FormData = jest.fn()
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 15) }
})

// Silenciar logs durante tests
global.console = { ...console, log: jest.fn(), debug: jest.fn(), info: jest.fn() }
```

## 📁 Estructura de Archivos

```
__tests__/
├── setup/                      # Configuración global
│   ├── globalSetup.ts          # Setup antes de todos los tests
│   └── globalTeardown.ts       # Cleanup después de todos los tests
├── helpers/                    # Utilidades para testing
│   ├── testDb.ts              # Base de datos de prueba
│   └── authTestHelper.ts      # Helpers de autenticación
├── fixtures/                  # Datos de prueba
│   └── testData.ts           # Fixtures organizados por entidad
├── lib/                       # Tests de funciones core
│   ├── auth.test.ts          # Autenticación y autorización
│   ├── multitenant.test.ts   # Aislamiento multitenant
│   ├── financial-calculations.test.ts  # Cálculos financieros
│   └── verifactu.test.ts     # Sistema VERI*FACTU
├── actions/                   # Tests de server actions
│   └── invoices.test.ts      # Actions de facturación
├── api/                       # Tests de API routes
├── components/                # Tests de componentes React
└── integration/              # Tests de flujos completos
```

## 🧪 Tipos de Tests Implementados

### 1. **Tests de Autenticación y Autorización** (`lib/auth.test.ts`)
- ✅ Verificación de contraseñas (desarrollo vs producción)
- ✅ Generación de hashes segura
- ✅ Verificación de sesiones
- ✅ Permisos granulares por módulo/acción
- ✅ Prevención de escalada de privilegios

```typescript
describe('Authentication & Authorization', () => {
  it('should verify correct password in development mode', async () => {
    const result = await verifyPassword('password123', 'any-hash')
    expect(result).toBe(true)
  })
  
  it('should enforce strict business isolation', async () => {
    const crossBusinessAccess = await hasPermission(
      testUsers.admin.id,
      testBusinesses.business2.id, // Different business
      'invoices',
      'view'
    )
    expect(crossBusinessAccess).toBe(false)
  })
})
```

### 2. **Tests de Aislamiento Multitenant** (`lib/multitenant.test.ts`)
- ✅ Aislamiento de datos por `businessId`
- ✅ Validación de relaciones usuario-negocio
- ✅ Prevención de acceso cruzado entre tenants
- ✅ Manejo de contexto de negocio activo
- ✅ Integridad de claves foráneas

```typescript
describe('Multi-tenant Data Isolation', () => {
  it('should isolate client data by businessId', async () => {
    const business1Clients = await db
      .select()
      .from(schema.clients)
      .where(and(
        eq(schema.clients.businessId, testBusinesses.business1.id),
        eq(schema.clients.isDeleted, false)
      ))
    
    expect(business1Clients).toHaveLength(1)
    expect(business1Clients[0].businessId).not.toBe(business2Clients[0].businessId)
  })
})
```

### 3. **Tests de Cálculos Financieros** (`lib/financial-calculations.test.ts`)
- ✅ Cálculos de líneas de factura (cantidad × precio)
- ✅ Cálculos de impuestos (IVA español: 0%, 4%, 10%, 21%)
- ✅ Subtotales y totales de facturas
- ✅ Descuentos y retenciones IRPF
- ✅ Precisión decimal y redondeo
- ✅ Formateo de moneda (EUR, locale español)

```typescript
describe('Financial Calculations', () => {
  it('should calculate invoice total correctly', () => {
    const sampleLines = [
      { quantity: 10, unitPrice: 100, taxRate: 21 },
      { quantity: 5, unitPrice: 50, taxRate: 10 },
    ]
    
    const total = FinancialCalculations.calculateTotal(sampleLines)
    expect(total).toBe(1510.00) // 1275 + 235 (tax)
  })
  
  it('should validate Spanish IVA rates', () => {
    expect(FinancialCalculations.isValidSpanishTaxRate(21)).toBe(true)
    expect(FinancialCalculations.isValidSpanishTaxRate(15)).toBe(false)
  })
})
```

### 4. **Tests de VERI*FACTU** (`lib/verifactu.test.ts`)
- ✅ Generación de hashes SHA-256 según especificaciones AEAT
- ✅ Validación de cadenas de hash (blockchain-like)
- ✅ Generación de códigos QR oficiales
- ✅ Formateo de datos para AEAT
- ✅ Integridad y seguridad de registros

```typescript
describe('VERI*FACTU System', () => {
  it('should generate consistent hash for same data', () => {
    const hash1 = generateVerifactuHash(sampleInvoiceData)
    const hash2 = generateVerifactuHash(sampleInvoiceData)
    
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256
    expect(hash1).toMatch(/^[A-F0-9]+$/) // Uppercase hex
  })
  
  it('should validate correct hash chain', () => {
    const records = [/* ... chain data ... */]
    expect(validateHashChain(records)).toBe(true)
  })
})
```

### 5. **Tests de Server Actions** (`actions/invoices.test.ts`)
- ✅ Creación, actualización y eliminación de facturas
- ✅ Validación de esquemas Zod
- ✅ Verificación de permisos
- ✅ Aislamiento multitenant en acciones
- ✅ Manejo de errores y rollbacks

```typescript
describe('Invoice Actions', () => {
  it('should create invoice successfully with valid data', async () => {
    mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)
    
    const result = await createInvoice(validInvoiceData)
    
    expect(result.success).toBe(true)
    expect(result.invoiceId).toBeDefined()
  })
  
  it('should enforce business isolation', async () => {
    const crossBusinessData = {
      ...validInvoiceData,
      clientId: otherClient.id // Cliente de otro negocio
    }
    
    const result = await createInvoice(crossBusinessData)
    expect(result.success).toBe(false)
  })
})
```

## 🎮 Comandos de Testing

### Comandos Básicos
```bash
# Ejecutar todos los tests
npm run test

# Modo desarrollo con auto-reload
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage

# Tests para CI/CD
npm run test:ci

# Tests silenciosos (sin logs)
npm run test:silent

# Tests con output detallado
npm run test:verbose
```

### Comandos Específicos
```bash
# Ejecutar tests específicos
npm run test -- --testPathPatterns="auth.test.ts"

# Ejecutar tests en serie (no paralelo)
npm run test -- --runInBand

# Ejecutar con watch en archivos específicos
npm run test:watch -- --testPathPatterns="financial"

# Ver cobertura de archivo específico
npm run test:coverage -- --collectCoverageFrom="lib/auth.ts"
```

## 🎯 Áreas Críticas Cubiertas

### 🔐 Seguridad y Autenticación
- **Verificación de contraseñas**: bcrypt vs desarrollo
- **Permisos granulares**: módulo + acción + negocio
- **Prevención de escalada**: checks de permisos estrictos
- **Aislamiento de sesiones**: contexto por usuario/negocio

### 💰 Cálculos Financieros
- **Precisión decimal**: sin pérdida de centimos
- **IVA español**: 0%, 4%, 10%, 21%
- **IRPF**: retenciones hasta 47%
- **Redondeo**: seguir estándares contables
- **Formateo**: EUR con locale español

### 🏢 Multitenant
- **Aislamiento de datos**: por `businessId`
- **Relaciones**: usuario ↔ negocio ↔ datos
- **Contexto activo**: cambio seguro de negocio
- **Integridad referencial**: claves foráneas

### 📋 VERI*FACTU (España)
- **Hashes oficiales**: SHA-256 según AEAT
- **Cadena de bloques**: validación de integridad
- **Códigos QR**: URL oficial de AEAT
- **Formatos**: fechas, importes, NIFs

### ⚙️ Server Actions
- **Validación de entrada**: Zod schemas
- **Autorización**: checks de permisos
- **Transacciones**: rollback en errores
- **Auditoría**: log de todas las acciones

## 📚 Ejemplos de Uso

### Crear Test de Nueva Funcionalidad

```typescript
// __tests__/lib/my-feature.test.ts
import { myFeature } from '@/lib/my-feature'
import { setupTestDb, cleanTestDb } from '../helpers/testDb'
import { mockAuthenticatedUser } from '../helpers/authTestHelper'

describe('My Feature', () => {
  let db: any

  beforeEach(async () => {
    db = await setupTestDb()
    await cleanTestDb()
    mockAuthenticatedUser('user-id', 'business-id')
  })

  it('should work correctly', async () => {
    const result = await myFeature('input')
    expect(result).toBe('expected-output')
  })
})
```

### Mock de Autenticación

```typescript
// Usuario autenticado con permisos
mockAuthenticatedUser(testUsers.admin.id, testBusinesses.business1.id)

// Usuario sin autenticar
mockUnauthenticatedUser()

// Permisos específicos
mockUserPermissions({
  'invoices-view': true,
  'invoices-create': false,
  'clients-edit': true,
})
```

### Base de Datos de Prueba

```typescript
import { setupTestDb, cleanTestDb } from '../helpers/testDb'

beforeEach(async () => {
  db = await setupTestDb() // BD limpia
  await cleanTestDb()      // Eliminar datos anteriores
  
  // Insertar datos de prueba
  await db.insert(schema.users).values(testUsers.admin)
})
```

## 🎨 Mejores Prácticas

### ✅ Hacer (Do's)
- **Aislar tests**: cada test debe ser independiente
- **Usar fixtures**: datos de prueba organizados y reutilizables
- **Mock externo**: APIs, servicios externos, file system
- **Describir claramente**: nombres descriptivos para tests
- **Probar casos extremos**: valores límite, errores, null/undefined
- **Validar seguridad**: intentos de acceso no autorizado

### ❌ No Hacer (Don'ts)
- **Depender de orden**: tests no deben depender de otros tests
- **Datos compartidos**: no reutilizar datos entre tests
- **APIs reales**: no llamar servicios externos en tests unitarios
- **Timeouts largos**: mantener tests rápidos (<30s)
- **Ignorar fallos**: investigar y arreglar tests fallidos
- **Skip tests**: no usar `.skip()` en tests críticos

### 🔒 Seguridad en Tests
```typescript
// ✅ Correcto: verificar aislamiento multitenant
it('should prevent cross-business access', async () => {
  const result = await accessResource(userId, wrongBusinessId)
  expect(result).toBeNull() // No debe acceder
})

// ✅ Correcto: validar permisos
it('should require admin permissions', async () => {
  mockUserPermissions({ 'resource-delete': false })
  const result = await deleteResource(resourceId)
  expect(result.success).toBe(false)
})
```

### 💰 Cálculos Financieros
```typescript
// ✅ Correcto: verificar precisión decimal
it('should maintain precision', () => {
  const result = calculateTax(33.33, 21)
  expect(result).toBe(7.00) // Exacto, no 6.9993
})

// ✅ Correcto: probar casos extremos
it('should handle zero amounts', () => {
  expect(calculateTotal([])).toBe(0.00)
  expect(calculateTax(0, 21)).toBe(0.00)
})
```

## 🔧 Troubleshooting

### Problemas Comunes

#### ❌ "No such table" en tests de BD
```javascript
// Problema: BD no inicializada
// Solución: verificar beforeEach
beforeEach(async () => {
  db = await setupTestDb()
  await cleanTestDb()
})
```

#### ❌ "Module not found" con alias @/
```javascript
// Problema: jest.config.js mal configurado
// Solución: verificar moduleNameMapper
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

#### ❌ Tests de autenticación fallan
```javascript
// Problema: mocks no configurados
// Solución: usar helpers
import { mockAuthenticatedUser } from '../helpers/authTestHelper'
mockAuthenticatedUser(userId, businessId)
```

#### ❌ Timeout en tests
```javascript
// Problema: operaciones lentas
// Solución: aumentar timeout específico
it('slow operation', async () => {
  // Configuración específica
}, 60000) // 60 segundos
```

### Debugging Tests

```bash
# Ejecutar test específico con debug
npm run test -- --testNamePattern="specific test" --verbose

# Ver stack traces completos
npm run test -- --verbose --no-coverage

# Ejecutar en serie para debug
npm run test -- --runInBand --detectOpenHandles
```

## 📊 Métricas y Cobertura

### Umbrales de Cobertura Configurados

| Área | Branches | Functions | Lines | Statements |
|------|----------|-----------|-------|------------|
| **Global** | 70% | 70% | 70% | 70% |
| **VERI*FACTU** | 90% | 90% | 90% | 90% |
| **Autenticación** | 85% | 85% | 85% | 85% |
| **Server Actions** | 80% | 80% | 80% | 80% |

### Generar Reportes
```bash
# Reporte de cobertura completo
npm run test:coverage

# Reporte HTML interactivo
npm run test:coverage -- --coverageReporters=html
open coverage/lcov-report/index.html
```

### Interpretar Métricas
- **Branches**: cobertura de condiciones if/else, switch
- **Functions**: porcentaje de funciones ejecutadas
- **Lines**: líneas de código ejecutadas
- **Statements**: declaraciones individuales ejecutadas

## 🚀 Tests en CI/CD

### Configuración para GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:ci && npm run lint"
    }
  }
}
```

## 📋 Checklist de Testing

### ✅ Antes de Hacer Deploy
- [ ] Todos los tests pasan (`npm run test`)
- [ ] Cobertura mínima alcanzada (`npm run test:coverage`)
- [ ] Tests de seguridad pasan (multitenant, permisos)
- [ ] Tests financieros pasan (cálculos críticos)
- [ ] Tests de VERI*FACTU pasan (si aplica)
- [ ] Lint sin errores (`npm run lint`)

### ✅ Al Agregar Nueva Funcionalidad
- [ ] Tests unitarios para la funcionalidad
- [ ] Tests de integración si toca múltiples módulos
- [ ] Tests de permisos si maneja autorización
- [ ] Tests de aislamiento multitenant si maneja datos
- [ ] Tests de validación de entrada
- [ ] Tests de casos extremos y errores

### ✅ Al Modificar Código Existente
- [ ] Tests existentes siguen pasando
- [ ] Actualizar tests si cambió la API
- [ ] Agregar tests para nuevos casos extremos
- [ ] Verificar que la cobertura no bajó
- [ ] Tests de regresión para bugs arreglados

## 🎯 Próximos Pasos

### Implementaciones Pendientes
- [ ] Tests de API routes (`__tests__/api/`)
- [ ] Tests de componentes React (`__tests__/components/`)
- [ ] Tests de integración completos (`__tests__/integration/`)
- [ ] Tests de performance para operaciones críticas
- [ ] Tests de accesibilidad para componentes UI

### Mejoras Futuras
- [ ] Configurar Playwright para tests E2E
- [ ] Implementar tests de carga con Artillery
- [ ] Configurar tests de seguridad con OWASP ZAP
- [ ] Implementar property-based testing con fast-check
- [ ] Configurar mutation testing con Stryker

---

## 📞 Soporte

Si tienes problemas con el sistema de testing:

1. **Revisar logs**: `npm run test:verbose`
2. **Verificar configuración**: comparar con este documento
3. **Limpiar cache**: `npm run test -- --clearCache`
4. **Reinstalar dependencias**: `rm -rf node_modules && npm install`

El sistema de testing está diseñado para ser **robusto**, **mantenible** y **escalable**. Proporciona la confianza necesaria para desarrollar y mantener una aplicación financiera crítica con múltiples tenants.

**¡Happy Testing! 🧪✨**