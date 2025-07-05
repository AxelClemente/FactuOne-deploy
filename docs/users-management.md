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
