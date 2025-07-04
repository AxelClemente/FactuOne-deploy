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

## 2. Flujo de Visualización de Usuarios por Negocio

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

## 3. Problemas y Soluciones Técnicas

- **Error de tipado:**  
  El array de usuarios podía contener `null` o `undefined`, lo que causaba errores de tipos en la UI.  
  **Solución:** Se usó un type guard en el `.filter()` para garantizar que solo se devuelvan usuarios válidos.

- **Campo `name` opcional:**  
  El campo `name` podía ser `null` en la base de datos.  
  **Solución:** Se asigna un valor por defecto (`"Sin nombre"`) si es `null`, asegurando que el tipo siempre sea `string`.

- **Acceso a propiedades de negocio:**  
  Se corrigió el uso de `getActiveBusiness` para que devuelva solo el ID cuando se requiere, y se hace una consulta adicional si se necesita el objeto completo.

---

## 4. Buenas Prácticas

- **Siempre tipar los datos que se pasan a la UI** para evitar errores de renderizado.
- **Usar type guards** en los filtros para arrays que pueden contener valores nulos o indefinidos.
- **Centralizar la lógica de obtención de usuarios** en una función server robusta y reutilizable.
- **Validar roles y permisos** en el backend antes de permitir acciones sensibles (crear, editar, eliminar usuarios).

---

## 5. Ejemplo de UI

La página `/users` muestra:

- Listado de usuarios asociados al negocio activo.
- Rol de cada usuario (Administrador, Contable, etc).
- Botón para crear nuevo usuario (solo visible para admin).
- Acciones de editar/eliminar según permisos.

<!-- Pega aquí tu captura de pantalla de la UI de usuarios -->

---

## 6. Resumen de reglas de negocio

- Solo el admin puede crear, editar y eliminar usuarios y negocios.
- Los usuarios solo pueden realizar acciones para las que tengan permiso explícito.
- El sistema es seguro, auditable y flexible para crecer en el futuro.

---

## 7. Mejoras Futuras

- Permisos granulares por módulo y acción.
- Roles personalizados.
- Auditoría avanzada de cambios de usuario y permisos.

---

## 8. Histórico de resolución y próximos pasos

### Resolución de problemas recientes (Julio 2024)

- **Problema:** El botón y formulario de "Nuevo usuario" solo debe estar disponible para usuarios con rol `admin` en el negocio activo. Sin embargo, aunque la UI lo mostraba, el backend redirigía porque la comprobación real de permisos fallaba.
- **Diagnóstico:**
  - Se revisó la tabla `business_users` y se detectó que el rol real era `accountant`, no `admin`.
  - Se usaron logs detallados en el backend para comparar los valores usados en la query y los existentes en la base de datos.
  - Se ejecutó un SQL directo para ver el valor exacto del campo `role` y se confirmó la discrepancia.
- **Solución:**
  - Se actualizó el valor del campo `role` a `admin` para el usuario y negocio correspondiente.
  - Se comprobó que la comprobación de permisos en backend y frontend es consistente y robusta.
  - Se documentó el flujo y se reforzó la importancia de la coincidencia exacta de valores en la base de datos.

### Recomendaciones y próximos pasos

- **Auditoría de roles:** Revisar periódicamente los roles en la tabla `business_users` para evitar inconsistencias.
- **UI/UX:** Mostrar mensajes claros si el usuario no tiene permisos para crear/editar usuarios, en vez de solo redirigir.
- **Permisos granulares:** Implementar una gestión más flexible de permisos (por módulo y acción) y roles personalizados.
- **Invitaciones y onboarding:** Añadir flujo de invitación por email y onboarding para nuevos usuarios.
- **Auditoría avanzada:** Registrar logs de cambios de roles y acciones de gestión de usuarios para trazabilidad.
- **Testing:** Añadir tests automáticos para los flujos de permisos y gestión multi-tenant.

---

*Este histórico se irá actualizando con cada mejora o resolución relevante.*

*Última actualización: Julio 2024*

---

## 9. Permisos granulares por usuario y módulo

Desde julio 2024, la plataforma soporta permisos granulares por usuario, negocio y módulo (clientes, facturas, proyectos, etc). Estos permisos se almacenan en la tabla `user_permissions` y se gestionan desde la UI de creación y edición de usuarios.

- Cada usuario puede tener permisos independientes para ver, crear, editar y eliminar en cada módulo.
- Los permisos se consultan en backend usando el helper `hasPermission`.
- Es responsabilidad de las server actions y páginas sensibles comprobar los permisos antes de ejecutar acciones.

### Ejemplo de comprobación de permisos en una server action

```typescript
import { hasPermission } from "@/lib/auth"

const canCreate = await hasPermission(user.id, businessId, "clients", "create")
if (!canCreate) {
  return { success: false, error: "No tienes permisos para crear clientes" }
}
```

### Recomendaciones de integración
- Comprobar permisos en todas las server actions de creación, edición y borrado.
- Ocultar botones y acciones en la UI si el usuario no tiene permiso.
- Mostrar mensajes claros de "No tienes permisos suficientes" si se deniega una acción.

---

## 10. Modelo profesional de roles y permisos (actualización Julio 2024)

### Resumen del modelo actual
- **Solo el admin/owner de cada negocio** puede gestionar usuarios y asignar roles/permisos.
- El resto de usuarios (rol `accountant` u operativo) solo puede operar en los módulos para los que tenga permisos granulares.
- **La UI y el backend dependen exclusivamente de los permisos granulares** para mostrar/permitir acciones operativas (crear, editar, eliminar en clientes, facturas, proyectos, proveedores, etc).
- El rol solo se usa para la gestión de usuarios y permisos.
- El sistema es multi-tenant real: cada usuario puede ser admin en un negocio y accountant en otro.

### Flujo de comprobación de permisos
- **Acciones de gestión de usuarios:**
  - Solo accesibles para el admin/owner del negocio (rol `admin` en `business_users`).
  - El resto de usuarios no ve ni puede acceder a `/users`, `/users/new`, `/users/[id]/edit`.
- **Acciones operativas (clientes, facturas, etc):**
  - Se comprueba el permiso granular con el helper `hasPermission`.
  - Si el permiso es `false`, la UI oculta el botón y el backend deniega la acción.

### Troubleshooting real y mejores prácticas
- **Si no ves un botón de acción (ej: "Nuevo Cliente") y tienes permisos en la base de datos:**
  1. Verifica que el campo correspondiente (`canCreate`, `canEdit`, etc) esté en `1` para tu usuario, negocio y módulo en la tabla `user_permissions`.
  2. Revisa los logs de la función `hasPermission` en el backend para ver el valor real leído.
  3. Si el valor es `false`, actualiza el registro en la base de datos.
  4. Haz un reload completo de la página para descartar problemas de caché/hydration.
- **El sistema solo muestra los botones si el permiso granular es `true`.**
- **El admin/owner debe tener todos los permisos granulares a `true` para operar sin restricciones.**

### Recomendaciones finales
- Mantener un solo admin/owner por negocio con todos los permisos y gestión de usuarios/permisos.
- El resto de usuarios deben ser accountant (u otro rol operativo) y tener permisos granulares.
- La UI y el backend deben depender solo de los permisos granulares para acciones operativas.
- El rol solo debe usarse para gestión de usuarios y permisos.
- Auditar periódicamente los permisos y roles en la base de datos para evitar inconsistencias.

### Histórico de depuración y logros (Julio 2024)
- Se implementó y depuró un sistema robusto de permisos granulares multi-tenant, con protección en backend y frontend.
- Se corrigió el error de visibilidad de botones de creación, asegurando que dependan solo del permiso granular.
- Se eliminaron rutas y componentes legacy de gestión de usuarios global.
- Se documentó el flujo y se reforzó la importancia de la coincidencia exacta de valores en la base de datos.
- El sistema sigue el patrón SaaS profesional: solo un admin/owner por negocio puede gestionar usuarios y permisos, el resto son operativos con permisos granulares.

---

*Última actualización: Julio 2024 (modelo profesional de permisos granulares y roles SaaS)*

---
