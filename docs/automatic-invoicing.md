# Automatización de Emisión de Facturas Recurrentes

## Objetivo
Permitir a los usuarios programar la emisión automática de facturas a clientes en intervalos definidos (días, meses, años), con importe y concepto fijos, y un número máximo de repeticiones o indefinido.

---

## Roadmap de Implementación

### 1. Nueva sección: "Automatizaciones"
- Añadir una nueva entrada en el dashboard y sidebar: **Automatizaciones**.
- Página principal: lista de automatizaciones existentes (cliente, frecuencia, estado, próximas ejecuciones, repeticiones, etc.).
- Botón para crear nueva automatización.

### 2. Formulario de creación de automatización
- Seleccionar cliente (dropdown de clientes activos del negocio).
- Importe fijo y concepto de la factura.
- Frecuencia: cada X días, meses o años (selector flexible).
- Fecha y hora de primera emisión.
- Número máximo de repeticiones (o "indefinido").
- Estado: activa/pausada.
- Vista previa de la próxima factura a emitir.

### 3. Edición y gestión de automatizaciones
- Permitir pausar, reanudar, editar o eliminar automatizaciones.
- Mostrar historial de ejecuciones y facturas generadas automáticamente.

### 4. Integración con facturas emitidas
- En la edición de una factura, añadir botón "Automatizar".
- Al pulsarlo, redirigir al formulario de automatización con los datos precargados de la factura.

### 5. Backend: lógica de automatización
- Crear nueva tabla `invoice_automations` (o similar) para almacenar las reglas de automatización.
- Guardar: cliente, importe, concepto, frecuencia, fecha/hora inicio, repeticiones, estado, timestamps, etc.
- Crear endpoint/server action para crear, editar, pausar y eliminar automatizaciones.

### 6. Cron job para emisión automática
- Usar **Vercel Cron** (o similar) para ejecutar un job cada X minutos.
- El job revisa las automatizaciones activas y genera facturas cuando corresponde.
- Registrar cada ejecución y actualizar el contador de repeticiones.
- Si se alcanza el máximo, marcar como finalizada.

### 7. Notificaciones automáticas
- Al emitir una factura automáticamente:
  - Notificar al cliente por email (usando Resend o similar).
  - Notificar al usuario interno (opcional).
  - Registrar en el log de auditoría.

### 8. UX y cumplimiento legal
- Todas las facturas generadas automáticamente deben cumplir los mismos requisitos legales y de auditoría que las manuales.
- Mostrar en el historial de facturas el origen: "Automática" o "Manual".
- Permitir exportar el historial de automatizaciones y facturas generadas.

---

## Siguientes pasos
1. Crear la tabla y modelo de automatizaciones en la base de datos.
2. Implementar la sección y formulario en el dashboard.
3. Desarrollar la lógica backend y el cron job.
4. Integrar notificaciones y logs de auditoría.
5. Mejorar la UX y añadir atajos desde facturas.

---

*Este roadmap se irá actualizando según el avance y feedback del equipo.*
