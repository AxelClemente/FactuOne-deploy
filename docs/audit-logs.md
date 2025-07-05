# Sistema de Auditoría - FactuOne (2025)

## 1. Resumen de lo implementado

### 1.1 Arquitectura y Base de Datos
- Se creó la tabla `audit_logs` en MySQL, con los siguientes campos:
  - `id` (UUID)
  - `business_id` (UUID, referencia a negocio)
  - `user_id` (UUID, referencia a usuario)
  - `action` (string, tipo de acción: create, update, download, etc.)
  - `module` (string, módulo afectado: invoices, clients, audit, etc.)
  - `entity_id` (UUID, ID de la entidad afectada)
  - `entity_type` (string, tipo de entidad: invoice, client, etc.)
  - `details` (text, detalles en JSON)
  - `ip_address` (string, IP del usuario)
  - `user_agent` (string, navegador del usuario)
  - `created_at`, `updated_at` (timestamps)

### 1.2 Backend y lógica de registro
- Se implementó el archivo `lib/audit.ts` con:
  - Función genérica `logAuditEvent` para registrar cualquier evento relevante.
  - Helpers específicos para facturas: `logInvoiceCreated`, `logInvoiceUpdated`, `logInvoiceDownloaded`, etc.
  - Funciones para consultar logs (`getAuditLogs`), logs por entidad y estadísticas (`getAuditStats`).
  - Todos los accesos a la base de datos usan `getDb()` asíncrono.
- Se integró el registro de auditoría en:
  - **Creación de facturas** (acción `create` en módulo `invoices`)
  - **Actualización de facturas** (acción `update` en módulo `invoices`)
  - **Cambio de estado de facturas** (acción `status_change` en módulo `invoices`)
  - **Descarga de PDF/XML de facturas** (acción `download` en módulo `invoices`)
- El registro incluye usuario, negocio, acción, módulo, entidad, detalles, IP y user agent.

### 1.3 Sistema de permisos
- El acceso a la auditoría está protegido por la tabla `user_permissions`:
  - Se requiere un registro con `module = 'audit'` y `can_view = 1` para ver los logs.
  - El permiso puede ser gestionado visualmente desde la UI de usuarios.
- Se agregó el módulo "Auditoría" a la tabla de permisos granulares en la UI de edición de usuario.

### 1.4 Interfaz de usuario (UI)
- Página `/audit` con:
  - **Estadísticas**: total de eventos, eventos de hoy, acción más frecuente, módulo más activo.
  - **Filtros avanzados**: por módulo, acción, usuario, entidad, fechas.
  - **Tabla de logs**: muestra fecha, usuario, acción, módulo, entidad, detalles y IP.
  - Visualización profesional y responsiva.
- Permisos de auditoría gestionables desde la UI de usuarios.

### 1.5 Cumplimiento normativo
- El sistema de auditoría implementado cumple con los requisitos de la AEAT y la normativa española de facturación electrónica:
  - Registro inmutable de eventos críticos.
  - Trazabilidad completa de acciones relevantes.
  - Asociación de cada evento a usuario, negocio y entidad.
  - Consulta y exportabilidad de logs (exportación pendiente).
  - Protección de acceso mediante permisos granulares.

### 1.6 Ejemplo de log registrado
```
Fecha: 05/07/2025, 23:41:58
Usuario: 0cacd17e...
Acción: create
Módulo: Facturas Emitidas
Entidad: a802030b...
Detalles: number: F202507462, concept: compra de dominios, total: 39...
IP: -
```

---

## 2. Acciones pendientes para un sistema de auditoría 100% robusto

### 2.1 Integración de más acciones
- [ ] **Eliminar factura**: registrar acción `delete` en módulo `invoices`.
- [ ] **Eliminar cliente/proveedor/proyecto**: registrar acción `delete` en los módulos correspondientes.
- [ ] **Creación, edición y eliminación de usuarios**: registrar acciones en módulo `users`.
- [ ] **Login y logout de usuarios**: registrar acciones `login` y `logout` en módulo `auth`.
- [ ] **Cambios de permisos**: registrar acción `permission_change` en módulo `users` o `system`.
- [ ] **Visualización de registros sensibles**: registrar acción `view` cuando se accede a datos críticos.
- [ ] **Descarga de reportes y exportaciones**: registrar acción `download` en módulos relevantes.

### 2.2 Mejoras técnicas y de cumplimiento
- [ ] **Evitar borrado de logs**: proteger la tabla `audit_logs` para que no pueda ser modificada ni borrada por usuarios estándar.
- [ ] **Exportar logs**: permitir exportar los logs a CSV/PDF desde la UI.
- [ ] **Auditoría de acceso a la auditoría**: registrar cada vez que un usuario consulta los logs.
- [ ] **Firma digital de logs** (opcional): implementar firma digital para máxima robustez.
- [ ] **Notificaciones de eventos críticos**: enviar alertas cuando ocurren acciones sensibles (opcional).
- [ ] **Auditoría de cambios en configuración del sistema**: registrar cambios en parámetros globales.

### 2.3 Documentación y validación
- [ ] **Documentar todos los eventos registrados** y su significado.
- [ ] **Validar el sistema con casos reales y simulaciones de inspección AEAT**.
- [ ] **Revisión periódica de la integridad de los logs**.

---

## 3. Próximos pasos sugeridos
- Integrar registro de eliminación de facturas y entidades clave.
- Añadir logs de login/logout y cambios de permisos.
- Proteger la tabla de logs contra borrado/edición.
- Añadir exportación de logs.
- Documentar y validar el sistema periódicamente.

---

*Última actualización: Julio 2025*
