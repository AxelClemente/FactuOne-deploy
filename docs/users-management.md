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

*Última actualización: Julio 2024 (modelo híbrido de exclusión por entidad y permisos granulares)*
