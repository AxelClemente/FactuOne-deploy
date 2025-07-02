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
