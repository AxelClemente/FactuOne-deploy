# Gestión de Usuarios de la Plataforma

## Objetivo
Permitir la creación, gestión y asignación de permisos a usuarios dentro de la plataforma, de modo que el administrador (usuario principal) pueda controlar el acceso y las acciones de cada usuario sobre los distintos módulos del sistema.

---

## 1. Modelo Multi-tenant y Relación Usuario-Negocio

La plataforma implementa un modelo multi-tenant real, donde:

- Un **usuario** puede pertenecer a varios **negocios**.
- Un **negocio** puede tener varios **usuarios** asociados, cada uno con un rol específico (`admin`, `accountant`, etc).
- La relación se gestiona mediante la tabla intermedia `business_users`.

### Esquema relevante

```typescript
// app/db/schema.ts
export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  isDeleted: boolean
}

export type BusinessUser = {
  id: string
  userId: string
  businessId: string
  role: "admin" | "accountant"
}
```

---

## 2. Permisos granulares con exclusión de entidades (modelo híbrido)

Desde julio 2024, la plataforma soporta un modelo híbrido de permisos granulares:
- Por defecto, los usuarios con permiso sobre un módulo (Clientes, Proveedores, Proyectos) pueden ver y operar sobre **todas** las entidades de ese módulo.
- **Exclusión selectiva:** El admin puede seleccionar entidades (clientes, proveedores, proyectos) que quedarán ocultas para ese usuario, independientemente de los permisos generales.
- Esto permite, por ejemplo, que un usuario pueda ver y gestionar todos los clientes **excepto** algunos seleccionados.

### Estructura de exclusiones
- Se utiliza una tabla `user_module_exclusions`:
  - `id` (uuid)
  - `user_id` (uuid)
  - `business_id` (uuid)
  - `module` (varchar) -- 'clients', 'providers', 'projects'
  - `entity_id` (uuid) -- id del cliente/proveedor/proyecto excluido
  - `created_at`, `updated_at`

### Impacto en la visibilidad de datos
- Si un usuario es excluido de un cliente, proveedor o proyecto:
  - **No podrá ver ni operar** sobre esa entidad en la UI.
  - **No podrá ver ninguna factura** (emitida o recibida) asociada a esa entidad.
  - Si se excluye un proyecto, tampoco verá las facturas asociadas a ese proyecto.

### Ejemplo de lógica de backend
```typescript
// Obtener clientes visibles para un usuario
const excludedClientIds = await db.select().from(userModuleExclusions)
  .where({ userId, businessId, module: 'clients' })
  .map(e => e.entityId);
const visibleClients = allClients.filter(c => !excludedClientIds.includes(c.id));

// Al consultar facturas emitidas:
const visibleInvoices = allInvoices.filter(inv => !excludedClientIds.includes(inv.clientId));
```

### UI/UX
- Al asignar permisos sobre un módulo, aparece un multiselect para seleccionar entidades a excluir.
- El usuario verá todos los ítems del módulo **excepto** los excluidos.
- La exclusión es opcional y puede modificarse en cualquier momento por el admin.

---

## 3. Flujo de Visualización de Usuarios por Negocio

- Al acceder a `/users`, se obtiene el **negocio activo** (por cookie o contexto).
- Se consultan las relaciones en `business_users` para ese negocio.
- Se obtienen los datos de usuario para cada relación.
- Se muestra la lista de usuarios y sus roles en la UI.

### Ejemplo de función robusta (TypeScript + Drizzle)

```typescript
export async function getUsersForBusiness(businessId: string) {
  if (!businessId) return [];
  const db = await getDb();
  const businessUsersRows = await db
    .select()
    .from(schema.businessUsers)
    .where(eq(schema.businessUsers.businessId, businessId));
  if (businessUsersRows.length === 0) return [];
  const userIds = businessUsersRows.map((bu) => bu.userId);
  const usersRows = userIds.length
    ? await db.select().from(schema.users).where(inArray(schema.users.id, userIds))
    : [];
  // Unir datos y asegurar tipado correcto
  return businessUsersRows
    .map((bu) => {
      const user = usersRows.find((u) => u.id === bu.userId);
      if (!user) return undefined;
      return {
        id: user.id,
        name: user.name ?? "Sin nombre",
        email: user.email,
        role: bu.role,
      };
    })
    .filter((u): u is { id: string; name: string; email: string; role: any } => u !== undefined);
}
```

---

## 4. Problemas y Soluciones Técnicas

- **Error de tipado:**  
  El array de usuarios podía contener `null` o `undefined`, lo que causaba errores de tipos en la UI.  
  **Solución:** Se usó un type guard en el `.filter()` para garantizar que solo se devuelvan usuarios válidos.

- **Campo `name` opcional:**  
  El campo `name` podía ser `null` en la base de datos.  
  **Solución:** Se asigna un valor por defecto (`"Sin nombre"`) si es `null`, asegurando que el tipo siempre sea `string`.

- **Acceso a propiedades de negocio:**  
  Se corrigió el uso de `getActiveBusiness` para que devuelva solo el ID cuando se requiere, y se hace una consulta adicional si se necesita el objeto completo.

---

## 5. Buenas Prácticas

- **Siempre tipar los datos que se pasan a la UI** para evitar errores de renderizado.
- **Usar type guards** en los filtros para arrays que pueden contener valores nulos o indefinidos.
- **Centralizar la lógica de obtención de usuarios** en una función server robusta y reutilizable.
- **Validar roles y permisos** en el backend antes de permitir acciones sensibles (crear, editar, eliminar usuarios).
- **Filtrar entidades y facturas asociadas** según las exclusiones configuradas para cada usuario.

---

## 6. Ejemplo de UI

La página `/users` muestra:

- Listado de usuarios asociados al negocio activo.
- Rol de cada usuario (Administrador, Contable, etc).
- Botón para crear nuevo usuario (solo visible para admin).
- Acciones de editar/eliminar según permisos.
- Permisos granulares y exclusiones configurables por módulo.

---

## 7. Reglas de negocio y seguridad

- Solo el admin puede crear, editar y eliminar usuarios y negocios.
- Los usuarios solo pueden realizar acciones para las que tengan permiso explícito.
- El sistema es seguro, auditable y flexible para crecer en el futuro.
- Las exclusiones de entidades afectan también a la visibilidad de facturas asociadas.

---

## 8. Mejoras Futuras

- Permisos granulares por usuario y módulo.
- Roles personalizados.
- Auditoría avanzada de cambios de usuario y permisos.
- Flujo de invitación y onboarding de usuarios.
- Gestión visual de exclusiones y sugerencias inteligentes.

---

## 9. Implementación Completa de Exclusiones por Entidad (Diciembre 2024)

### Resumen de Implementación
Se ha completado la implementación del sistema de exclusiones por entidad para **todos los módulos principales** (Clientes, Proveedores, Proyectos). El sistema ahora funciona de manera consistente en toda la aplicación, filtrando automáticamente las entidades excluidas según el usuario actual.

### Módulos Implementados

#### 1. Clientes (`clients`)
- **Función principal:** `getClientsWithStats(businessId, userId?)`
- **Función pública:** `getClientsForCurrentUser(businessId)`
- **Página afectada:** `/clients` - Listado de clientes
- **Filtrado:** Los clientes excluidos no aparecen en la lista ni en las estadísticas

#### 2. Proveedores (`providers`)
- **Función principal:** `getProviders(businessId, userId?)`
- **Función pública:** `getProvidersForCurrentUser(businessId)`
- **Página afectada:** `/proveedores` - Listado de proveedores
- **Página de detalle:** `/proveedores/[id]` - Detalle del proveedor
- **Filtrado:** Los proveedores excluidos no aparecen en la lista ni en las estadísticas

#### 3. Proyectos (`projects`)
- **Función principal:** `getProjects({..., userId?})`
- **Función pública:** `getProjectsForCurrentUser({...})`
- **Página afectada:** `/projects` - Listado de proyectos (via `ProjectList` component)
- **Filtrado:** Los proyectos excluidos no aparecen en la lista

#### 4. Facturas Emitidas (`invoices`)
- **Función principal:** `getInvoices({..., userId?})`
- **Función pública:** `getInvoicesForCurrentUser({...})`
- **Página afectada:** `/invoices` - Listado de facturas emitidas
- **Componente:** `InvoiceList` - Lista de facturas con filtrado
- **Filtrado:** Las facturas asociadas a clientes o proyectos excluidos no aparecen

#### 5. Facturas Recibidas (`received_invoices`)
- **Función principal:** `getReceivedInvoices({..., userId?})`
- **Función pública:** `getReceivedInvoicesForCurrentUser({...})`
- **Página afectada:** `/received-invoices` - Listado de facturas recibidas
- **Componente:** `ReceivedInvoiceList` - Lista de facturas recibidas con filtrado
- **Filtrado:** Las facturas asociadas a proveedores o proyectos excluidos no aparecen

### Arquitectura de Funciones

#### Patrón de Implementación
Cada módulo sigue el mismo patrón:

1. **Función interna:** Acepta `userId` opcional para filtrado
2. **Función pública:** Obtiene automáticamente el usuario actual y llama a la función interna
3. **Filtrado:** Consulta `user_module_exclusions` y filtra las entidades excluidas

```typescript
// Ejemplo para proveedores
export async function getProviders(businessId: string, userId?: string) {
  // ... obtener proveedores ...
  
  // Si hay userId, filtrar por exclusiones
  if (userId) {
    const excludedProviderIds = await db.select().from(userModuleExclusions)
      .where(and(
        eq(userModuleExclusions.userId, userId),
        eq(userModuleExclusions.businessId, businessId),
        eq(userModuleExclusions.module, "providers")
      ))
      .then(rows => rows.map(r => r.entityId));
    providersList = providersList.filter(p => !excludedProviderIds.includes(p.id));
  }
  
  return providersList;
}

// Función pública para uso en componentes
export async function getProvidersForCurrentUser(businessId: string) {
  const user = await getCurrentUser()
  const userId = user?.id
  return getProviders(businessId, userId)
}
```

### Componentes Actualizados

#### Formularios de Usuarios
- **`user-registration-form.tsx`:** Usa `getClientsForCurrentUser`, `getProvidersForCurrentUser`, `getProjectsForCurrentUser`
- **`user-form.tsx`:** Usa las mismas funciones para mostrar solo entidades visibles al admin

#### Páginas de Listado
- **`/clients`:** Usa `getClientsWithStats(businessId, user.id)`
- **`/proveedores`:** Usa `getProviders(businessId, user.id)`
- **`/projects`:** Usa `getProjectsForCurrentUser` via `ProjectList` component

### Lógica de Filtrado

#### Consulta de Exclusiones
```sql
SELECT entity_id FROM user_module_exclusions 
WHERE user_id = ? AND business_id = ? AND module = ?
```

#### Filtrado en Memoria
```typescript
// Obtener IDs excluidos
const excludedIds = await db.select().from(userModuleExclusions)
  .where(and(
    eq(userModuleExclusions.userId, userId),
    eq(userModuleExclusions.businessId, businessId),
    eq(userModuleExclusions.module, moduleName)
  ))
  .then(rows => rows.map(r => r.entityId));

// Filtrar entidades
const filteredEntities = allEntities.filter(e => !excludedIds.includes(e.id));
```

#### Filtrado de Facturas (Caso Especial)
Las facturas requieren un filtrado más complejo porque están asociadas a entidades:

```typescript
// Para facturas emitidas: filtrar por clientes y proyectos excluidos
const excludedClientIds = await db.select().from(userModuleExclusions)
  .where(and(
    eq(userModuleExclusions.userId, userId),
    eq(userModuleExclusions.businessId, businessId),
    eq(userModuleExclusions.module, "clients")
  ))
  .then(rows => rows.map(r => r.entityId));

const excludedProjectIds = await db.select().from(userModuleExclusions)
  .where(and(
    eq(userModuleExclusions.userId, userId),
    eq(userModuleExclusions.businessId, businessId),
    eq(userModuleExclusions.module, "projects")
  ))
  .then(rows => rows.map(r => r.entityId));

// Filtrar facturas que no estén asociadas a entidades excluidas
const filteredInvoices = allInvoices.filter(invoice => {
  const isClientExcluded = excludedClientIds.includes(invoice.clientId);
  const isProjectExcluded = invoice.projectId && excludedProjectIds.includes(invoice.projectId);
  return !isClientExcluded && !isProjectExcluded;
});
```

### Impacto en la Experiencia de Usuario

#### Para Administradores
- Pueden configurar exclusiones en los formularios de usuarios
- Ven todas las entidades disponibles para asignar exclusiones
- Las exclusiones se aplican inmediatamente

#### Para Usuarios Regulares
- Solo ven las entidades a las que tienen acceso
- Las facturas asociadas a entidades excluidas también quedan ocultas
- La experiencia es transparente: no ven lo que no pueden acceder

### Consideraciones Técnicas

#### Rendimiento
- Las consultas de exclusión se ejecutan una vez por página
- El filtrado se hace en memoria después de obtener los datos
- No hay impacto significativo en el rendimiento

#### Seguridad
- El filtrado se aplica en el servidor, no en el cliente
- Los usuarios no pueden acceder a entidades excluidas incluso manipulando las URLs
- Las exclusiones se verifican en cada consulta

#### Mantenibilidad
- Patrón consistente en todos los módulos
- Funciones reutilizables y bien documentadas
- Fácil extensión a nuevos módulos

### Casos de Uso Implementados

#### Escenario 1: Usuario con Acceso Limitado
- **Configuración:** Usuario con permiso "ver clientes" pero excluido de 2 clientes específicos
- **Resultado:** Ve todos los clientes excepto los 2 excluidos
- **Facturas:** No ve facturas asociadas a los clientes excluidos

#### Escenario 2: Usuario con Acceso Completo
- **Configuración:** Usuario con permisos completos sin exclusiones
- **Resultado:** Ve todas las entidades del módulo
- **Facturas:** Ve todas las facturas asociadas

#### Escenario 3: Administrador Configurando Exclusiones
- **Configuración:** Admin editando permisos de usuario
- **Resultado:** Ve todas las entidades disponibles para asignar exclusiones
- **Interfaz:** Checkboxes para seleccionar exclusiones

#### Escenario 4: Usuario con Acceso a Facturas Limitado
- **Configuración:** Usuario con permiso "ver facturas" pero excluido de 2 clientes específicos
- **Resultado:** Ve todas las facturas emitidas excepto las asociadas a los clientes excluidos
- **Facturas recibidas:** Ve todas las facturas recibidas excepto las asociadas a proveedores excluidos
- **Proyectos:** Si está excluido de un proyecto, no ve facturas asociadas a ese proyecto

### Próximos Pasos Recomendados

#### Mejoras Inmediatas
1. **Auditoría:** Agregar logs de acceso a entidades excluidas
2. **Cache:** Implementar cache para consultas de exclusión frecuentes
3. **UI:** Mejorar la interfaz de configuración de exclusiones

#### Mejoras Futuras
1. **Exclusiones Temporales:** Permitir exclusiones con fecha de expiración
2. **Exclusiones por Rol:** Exclusiones automáticas basadas en roles
3. **Análisis de Uso:** Métricas sobre qué entidades se excluyen más frecuentemente
4. **Sugerencias Inteligentes:** Recomendar exclusiones basadas en patrones de uso

### Código de Ejemplo para Nuevos Módulos

```typescript
// Para agregar exclusiones a un nuevo módulo (ej: "products")
export async function getProducts(businessId: string, userId?: string) {
  const db = await getDb()
  let productsList = await db.select().from(products)
    .where(and(
      eq(products.businessId, businessId),
      eq(products.isDeleted, false)
    ))

  // Aplicar filtrado de exclusiones
  if (userId) {
    const excludedProductIds = await db.select().from(userModuleExclusions)
      .where(and(
        eq(userModuleExclusions.userId, userId),
        eq(userModuleExclusions.businessId, businessId),
        eq(userModuleExclusions.module, "products")
      ))
      .then(rows => rows.map(r => r.entityId));
    productsList = productsList.filter(p => !excludedProductIds.includes(p.id));
  }

  return productsList
}

export async function getProductsForCurrentUser(businessId: string) {
  const user = await getCurrentUser()
  const userId = user?.id
  return getProducts(businessId, userId)
}
```

---

*Última actualización: Diciembre 2024 (implementación completa de exclusiones por entidad)*
