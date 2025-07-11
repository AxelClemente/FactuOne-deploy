# Automatización de Emisión de Facturas Recurrentes

## Objetivo
Permitir a los usuarios programar la emisión automática de facturas a clientes en intervalos definidos (días, meses, años), con líneas de factura detalladas, proyecto asociado, importe y concepto fijos, y un número máximo de repeticiones o indefinido.

---

## Logros recientes

- Sección de automatizaciones implementada en el dashboard, con listado, creación, edición y **eliminación real** de automatizaciones.
- Permisos granulares: solo los usuarios con permiso pueden crear, editar o eliminar automatizaciones.
- Formulario unificado para crear y editar automatizaciones, con validación robusta y guardado en base de datos.
- **Soporte completo para líneas de factura**: cada automatización puede tener múltiples líneas con descripción, cantidad, precio unitario e IVA, igual que una factura manual.
- **Selección de proyecto**: cada automatización puede asociarse opcionalmente a un proyecto del negocio.
- **Precarga total en edición**: al editar una automatización, se precargan correctamente cliente, concepto, proyecto y todas las líneas de factura.
- Menú de acciones en cada automatización para ver detalle, editar y eliminar.
- Página de **detalle de automatización** con información completa y profesional.
- **Historial de ejecuciones**: muestra todas las ejecuciones de la automatización, con fechas formateadas, estado, factura generada y errores si los hay.
- UI profesional: bordes dashed, botón de volver, diseño consistente y experiencia de usuario alineada con el resto del sistema.
- Navegación intuitiva: desde el listado puedes acceder a editar, eliminar o ver el historial de cada automatización.
- **Botones de acción consistentes**: tanto en creación como edición, los botones "Cancelar" y "Crear automatización"/"Guardar cambios" están alineados a la derecha, igual que en facturas.
- Robustez en el manejo de fechas y errores: nunca se renderizan objetos Date directamente, evitando errores de React y asegurando compatibilidad cross-browser.

---

## Roadmap de Implementación

### 1. Nueva sección: "Automatizaciones"
- Añadir una nueva entrada en el dashboard y sidebar: **Automatizaciones**.
- Página principal: lista de automatizaciones existentes (cliente, proyecto, frecuencia, estado, próximas ejecuciones, repeticiones, etc.).
- Botón para crear nueva automatización.

### 2. Formulario de creación/edición de automatización
- Seleccionar cliente (dropdown de clientes activos del negocio).
- Seleccionar proyecto (dropdown de proyectos activos del negocio, opcional).
- Definir líneas de factura: descripción, cantidad, precio unitario, IVA.
- Concepto general de la factura.
- Frecuencia: cada X días, meses o años (selector flexible).
- Fecha y hora de primera emisión.
- Número máximo de repeticiones (o "indefinido").
- Estado: activa/pausada.
- Vista previa de la próxima factura a emitir.

### 3. Edición y gestión de automatizaciones
- Permitir pausar, reanudar, editar o eliminar automatizaciones.
- Mostrar historial de ejecuciones y facturas generadas automáticamente.
- Precarga completa de todos los campos al editar.

### 4. Integración con facturas emitidas
- En la edición de una factura, añadir botón "Automatizar".
- Al pulsarlo, redirigir al formulario de automatización con los datos precargados de la factura.

### 5. Backend: lógica de automatización
- Tablas `invoice_automations` y `automation_lines` para almacenar reglas y líneas de automatización.
- Guardar: cliente, proyecto, líneas, importe, concepto, frecuencia, fecha/hora inicio, repeticiones, estado, timestamps, etc.
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
1. Añadir opción de pausar/reanudar automatizaciones.
2. Integrar el botón "Automatizar" en la edición de facturas.
3. Desarrollar el cron job backend para emisión automática.
4. Integrar notificaciones y logs de auditoría.
5. Mejorar la UX y cumplimiento legal (origen de factura, exportación, etc.).

---

*Este roadmap se irá actualizando según el avance y feedback del equipo.*
