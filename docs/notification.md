# Plan para un Sistema de Notificaciones Integral

## 1. Modelo de datos y backend
- **Tabla `notifications` en la base de datos** con campos:
  - `id` (UUID)
  - `userId` (opcional, para notificaciones personales)
  - `businessId` (opcional, para notificaciones de negocio)
  - `type` (ej: "info", "success", "warning", "error", "update", "action", etc.)
  - `title`
  - `message` o `summary`
  - `isRead` (boolean)
  - `createdAt`
  - `actionUrl` (opcional, para redirigir a la acción relevante)
- **Endpoints API REST o server actions** para:
  - Crear notificaciones (desde cualquier acción relevante)
  - Listar notificaciones (por usuario/negocio)
  - Marcar como leídas/no leídas
  - Eliminar notificaciones

## 2. Lógica de generación de notificaciones
- **En cada acción importante del sistema** (crear cliente, factura, proyecto, cambio de estado, etc.):
  - Llamar a la función/endpoint para crear una notificación.
  - Incluir información relevante (ej: "Factura #123 creada", "Nuevo cliente registrado", etc.).
- **Para notificaciones globales** (ej: actualización de la app), crear notificaciones sin `userId` o con un flag especial.

## 3. Frontend: consumo y visualización
- **El componente `NotificationsDropdown`**:
  - Obtiene las notificaciones del backend (fetch o server action).
  - Muestra el contador de no leídas.
  - Permite marcar como leída al hacer click.
  - Permite navegar a la acción relevante si hay `actionUrl`.
- **Opcional:** Usa WebSockets o Server-Sent Events para notificaciones en tiempo real.

## 4. Experiencia de usuario
- **Muestra un toast o badge** cuando llega una nueva notificación.
- **Permite filtrar o ver todas las notificaciones** en una página dedicada (historial completo).
- **Permite borrar o archivar notificaciones**.

## 5. Escalabilidad y extensibilidad
- **Soporta distintos tipos de notificaciones** (errores, avisos, acciones, actualizaciones).
- **Permite notificaciones por usuario, por negocio o globales**.
- **Fácil de extender** para nuevos tipos de eventos.

## ¿Por dónde empezar?
1. Define el modelo de notificación en la base de datos.
2. Crea las funciones/acciones para crear y listar notificaciones.
3. Integra la lógica de creación de notificaciones en los puntos clave del backend.
4. Modifica el componente para consumir datos reales y permitir interacción.
5. (Opcional) Añade tiempo real y página de historial.

---

# Implementación y logros actuales

- **Modelo creado en la base de datos**: Se creó la tabla `notifications` con los campos necesarios para soportar notificaciones por usuario, negocio y globales.
- **Definición Drizzle**: Se añadió la tabla `notifications` al schema de Drizzle para poder operar desde el backend.
- **Función de inserción**: Se implementó `createNotification` para insertar notificaciones desde cualquier acción relevante (ej: al crear una factura emitida).
- **Endpoint de consulta**: Se creó `/api/notifications` para obtener las notificaciones recientes del negocio activo, usando la cookie `active_business`.
- **Endpoint para marcar como leída**: Se implementó `/api/notifications/[id]/read` (PATCH) para actualizar el estado `is_read` de una notificación.
- **Frontend reactivo**: El componente `NotificationsDropdown` ahora:
  - Hace fetch de las notificaciones reales usando SWR.
  - Expone la función global `window.refreshNotifications` para forzar el refetch desde cualquier parte del frontend.
  - Muestra el contador de no leídas.
  - Permite marcar como leída al hacer clic (cambia color y actualiza el contador).
  - Cambia el color de las notificaciones leídas y oculta el punto azul.
- **Actualización inmediata tras crear un cliente**: Tras crear un cliente, se llama a `window.refreshNotifications()` y se espera un pequeño delay antes de redirigir, asegurando que la notificación aparece al instante en el dropdown.
- **Experiencia profesional**: El sistema es extensible, reactivo y preparado para soportar nuevos tipos de notificaciones y acciones.

**Próximos pasos recomendados:**
- Añadir redirección al hacer clic si la notificación tiene `action_url`.
- Añadir página de historial de notificaciones.
- Soporte para notificaciones en tiempo real (WebSockets/SSE).
