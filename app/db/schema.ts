// app/db/schema.ts
import { mysqlTable as table } from "drizzle-orm/mysql-core";
import * as t from "drizzle-orm/mysql-core";
import { sql, relations } from "drizzle-orm";

// Utilidades comunes - Volver a UUIDs como la base de datos real
const stringId = {
  id: t.varchar("id", { length: 36 }).primaryKey(),
};

const timestamps = {
  createdAt: t.datetime("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: t.datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
};

// ENUMs
export const invoiceStatus = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
export const receivedInvoiceStatus = ["pending", "recorded", "rejected", "paid"] as const;
export const projectStatus = ["won", "lost", "pending"] as const;
export const userRoles = ["admin", "accountant", "user"] as const;
export const notificationTypes = ["info", "success", "warning", "error", "update", "action"] as const;

// Users
export const users = table("users", {
  ...stringId,
  email: t.varchar("email", { length: 255 }).notNull(),
  passwordHash: t.varchar("password_hash", { length: 255 }).notNull(),
  name: t.varchar("name", { length: 255 }),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
}, (table) => [t.unique().on(table.email)]);

// Businesses
export const businesses = table("businesses", {
  ...stringId,
  name: t.varchar("name", { length: 255 }).notNull(),
  nif: t.varchar("nif", { length: 20 }).notNull(),
  fiscalAddress: t.varchar("fiscal_address", { length: 500 }).notNull(),
  phone: t.varchar("phone", { length: 20 }),
  email: t.varchar("email", { length: 255 }),
  ownerId: t.varchar("owner_id", { length: 36 }), // Nueva columna para el owner
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
}, (table) => [t.unique().on(table.nif)]);

// Banks (Información bancaria)
export const banks = table("banks", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  bankName: t.varchar("bank_name", { length: 255 }).notNull(),
  accountHolder: t.varchar("account_holder", { length: 255 }).notNull(),
  accountType: t.varchar("account_type", { length: 100 }).notNull(),
  nif: t.varchar("nif", { length: 20 }).notNull(),
  accountNumber: t.varchar("account_number", { length: 50 }).notNull(),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// BusinessUsers (Relación Usuario-Negocio)
export const businessUsers = table("business_users", {
  ...stringId,
  userId: t.varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  role: t.mysqlEnum("role", userRoles).notNull(),
  ...timestamps,
}, (table) => [t.unique().on(table.userId, table.businessId)]);

// Clients
export const clients = table("clients", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  name: t.varchar("name", { length: 255 }).notNull(),
  nif: t.varchar("nif", { length: 20 }).notNull(),
  address: t.varchar("address", { length: 500 }).notNull(),
  postalCode: t.varchar("postal_code", { length: 10 }),
  city: t.varchar("city", { length: 100 }),
  country: t.varchar("country", { length: 100 }).default("España"),
  phone: t.varchar("phone", { length: 20 }).notNull(),
  email: t.varchar("email", { length: 255 }).notNull(),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// InvoiceTypes
export const invoiceTypes = table("invoice_types", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  name: t.varchar("name", { length: 255 }).notNull(),
  code: t.varchar("code", { length: 50 }).notNull(),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// Invoices (Facturas Emitidas)
export const invoices = table("invoices", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  clientId: t.varchar("client_id", { length: 36 }).notNull().references(() => clients.id),
  projectId: t.varchar("project_id", { length: 36 }).references(() => projects.id),
  invoiceTypeId: t.varchar("invoice_type_id", { length: 36 }).references(() => invoiceTypes.id),
  number: t.varchar("number", { length: 50 }).notNull(),
  date: t.datetime("date").notNull(),
  dueDate: t.datetime("due_date").notNull(),
  concept: t.text("concept").notNull(),
  subtotal: t.decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: t.decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  total: t.decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: t.mysqlEnum("status", invoiceStatus).notNull().default("draft"),
  documentUrl: t.varchar("document_url", { length: 500 }),
  // Campos de método de pago
  paymentMethod: t.mysqlEnum("payment_method", ["bank", "bizum", "cash"]),
  bankId: t.varchar("bank_id", { length: 36 }).references(() => banks.id),
  bizumHolder: t.varchar("bizum_holder", { length: 255 }),
  bizumNumber: t.varchar("bizum_number", { length: 20 }),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// InvoiceLines (Líneas de Factura)
export const invoiceLines = table("invoice_lines", {
  ...stringId,
  invoiceId: t.varchar("invoice_id", { length: 36 }).notNull().references(() => invoices.id),
  description: t.text("description").notNull(),
  quantity: t.int("quantity").notNull(),
  unitPrice: t.decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: t.decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  total: t.decimal("total", { precision: 10, scale: 2 }).notNull(),
  ...timestamps,
});

// ReceivedInvoiceLines (Líneas de Factura Recibida)
export const receivedInvoiceLines = table("received_invoice_lines", {
  ...stringId,
  receivedInvoiceId: t.varchar("received_invoice_id", { length: 36 }).notNull().references(() => receivedInvoices.id),
  description: t.text("description").notNull(),
  quantity: t.int("quantity").notNull(),
  unitPrice: t.decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: t.decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  total: t.decimal("total", { precision: 10, scale: 2 }).notNull(),
  ...timestamps,
});

// ReceivedInvoiceTypes
export const receivedTypes = table("received_invoice_types", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  name: t.varchar("name", { length: 255 }).notNull(),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// Providers
export const providers = table("providers", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  name: t.varchar("name", { length: 255 }).notNull(),
  nif: t.varchar("nif", { length: 20 }).notNull(),
  address: t.varchar("address", { length: 500 }).notNull(),
  postalCode: t.varchar("postal_code", { length: 10 }),
  city: t.varchar("city", { length: 100 }),
  country: t.varchar("country", { length: 100 }).default("España"),
  phone: t.varchar("phone", { length: 20 }),
  email: t.varchar("email", { length: 255 }),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// ReceivedInvoices (Facturas Recibidas)
export const receivedInvoices = table("received_invoices", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  providerId: t.varchar("provider_id", { length: 36 }).references(() => providers.id),
  typeId: t.varchar("received_invoice_type_id", { length: 36 }).references(() => receivedTypes.id),
  projectId: t.varchar("project_id", { length: 36 }).references(() => projects.id),
  number: t.varchar("number", { length: 50 }).notNull(),
  date: t.datetime("date").notNull(),
  dueDate: t.datetime("due_date").notNull(),
  providerName: t.varchar("provider_name", { length: 255 }).notNull(),
  providerNIF: t.varchar("provider_nif", { length: 20 }).notNull(),
  amount: t.decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: t.decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  total: t.decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: t.mysqlEnum("status", receivedInvoiceStatus).notNull().default("pending"),
  category: t.varchar("category", { length: 100 }),
  documentUrl: t.varchar("document_url", { length: 500 }),
  // Campos de método de pago
  paymentMethod: t.mysqlEnum("payment_method", ["bank", "bizum", "cash"]),
  bankId: t.varchar("bank_id", { length: 36 }).references(() => banks.id),
  bizumHolder: t.varchar("bizum_holder", { length: 255 }),
  bizumNumber: t.varchar("bizum_number", { length: 20 }),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// Projects
export const projects = table("projects", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  clientId: t.varchar("client_id", { length: 36 }).references(() => clients.id),
  name: t.varchar("name", { length: 255 }).notNull(),
  description: t.text("description"),
  status: t.mysqlEnum("status", projectStatus).notNull().default("pending"),
  startDate: t.datetime("start_date"),
  endDate: t.datetime("end_date"),
  contractUrl: t.varchar("contract_url", { length: 500 }),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// Notifications
export const notifications = table("notifications", {
  id: t.varchar("id", { length: 36 }).primaryKey(),
  user_id: t.varchar("user_id", { length: 36 }),
  business_id: t.varchar("business_id", { length: 36 }),
  type: t.mysqlEnum("type", notificationTypes).notNull().default("info"),
  title: t.varchar("title", { length: 255 }).notNull(),
  message: t.text("message").notNull(),
  is_read: t.boolean("is_read").notNull().default(false),
  created_at: t.datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  action_url: t.varchar("action_url", { length: 500 }),
});

// UserPermissions (Permisos granulares por usuario y módulo)
export const userPermissions = table("user_permissions", {
  ...stringId,
  userId: t.varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  module: t.varchar("module", { length: 50 }).notNull(), // Ej: 'clients', 'invoices', etc.
  canView: t.boolean("can_view").default(false).notNull(),
  canCreate: t.boolean("can_create").default(false).notNull(),
  canEdit: t.boolean("can_edit").default(false).notNull(),
  canDelete: t.boolean("can_delete").default(false).notNull(),
  // ...timestamps, // Comentado temporalmente
}, (table) => [t.unique().on(table.userId, table.businessId, table.module)]);

// AuditLogs (Sistema de Auditoría)
export const auditLogs = table("audit_logs", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  userId: t.varchar("user_id", { length: 36 }).references(() => users.id),
  action: t.varchar("action", { length: 100 }).notNull(), // Ej: 'create', 'update', 'delete', 'download'
  module: t.varchar("module", { length: 50 }).notNull(), // Ej: 'invoices', 'clients', 'providers'
  entityId: t.varchar("entity_id", { length: 36 }), // ID de la entidad afectada
  entityType: t.varchar("entity_type", { length: 50 }), // Tipo de entidad
  details: t.text("details"), // Detalles adicionales en JSON
  ipAddress: t.varchar("ip_address", { length: 45 }), // IPv4 o IPv6
  userAgent: t.varchar("user_agent", { length: 500 }), // User agent del navegador
  ...timestamps,
});

// Automatización de emisión de facturas recurrentes
export const invoiceAutomations = table("invoice_automations", {
  id: t.varchar("id", { length: 36 }).primaryKey().notNull(),
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  clientId: t.varchar("client_id", { length: 36 }).notNull().references(() => clients.id),
  projectId: t.varchar("project_id", { length: 36 }).references(() => projects.id),
  amount: t.decimal("amount", { precision: 12, scale: 2 }).notNull(),
  concept: t.varchar("concept", { length: 255 }).notNull(),
  frequency: t.mysqlEnum("frequency", ["day", "month", "year"]).notNull(),
  interval: t.int("interval").notNull().default(1), // cada X días/meses/años
  startDate: t.date("start_date").notNull(),
  timeOfDay: t.time("time_of_day").notNull(),
  maxOccurrences: t.int("max_occurrences"), // null = indefinido
  occurrences: t.int("occurrences").notNull().default(0),
  isActive: t.boolean("is_active").notNull().default(true),
  lastRunAt: t.datetime("last_run_at"),
  // Campos del método de pago
  paymentMethod: t.mysqlEnum("payment_method", ["bank", "bizum", "cash"]),
  bankId: t.varchar("bank_id", { length: 36 }).references(() => banks.id),
  bizumHolder: t.varchar("bizum_holder", { length: 255 }),
  bizumNumber: t.varchar("bizum_number", { length: 20 }),
  createdAt: t.datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: t.datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Líneas de automatización de facturas
export const automationLines = table("automation_lines", {
  id: t.varchar("id", { length: 36 }).primaryKey(),
  automationId: t.varchar("automation_id", { length: 36 }).notNull().references(() => invoiceAutomations.id),
  description: t.varchar("description", { length: 255 }).notNull(),
  quantity: t.decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: t.decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: t.decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  total: t.decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: t.datetime("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: t.datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// Automatización de ejecución de automaciones
export const automationExecutions = table("automation_executions", {
  id: t.varchar("id", { length: 36 }).primaryKey(),
  automationId: t.varchar("automation_id", { length: 36 }).notNull(),
  invoiceId: t.varchar("invoice_id", { length: 36 }),
  executedAt: t.datetime("executed_at").notNull(),
  status: t.mysqlEnum("status", ["executed", "sent", "completed", "error"]).notNull(),
  errorMessage: t.text("error_message"),
  createdAt: t.datetime("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: t.datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// Exclusiones de entidades por usuario, negocio y módulo
export const userModuleExclusions = table("user_module_exclusions", {
  id: t.varchar("id", { length: 36 }).primaryKey(),
  userId: t.varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  module: t.varchar("module", { length: 50 }).notNull(), // 'clients', 'providers', 'projects'
  entityId: t.varchar("entity_id", { length: 36 }).notNull(),
  createdAt: t.datetime("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: t.datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => [t.unique().on(table.userId, table.businessId, table.module, table.entityId)]);

// Tabla para registro VERI*FACTU
export const verifactuRegistry = table("verifactu_registry", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  invoiceId: t.varchar("invoice_id", { length: 36 }).notNull().references(() => invoices.id),
  invoiceType: t.mysqlEnum("invoice_type", ["sent", "received"]).notNull(),
  sequenceNumber: t.int("sequence_number").notNull(), // Número secuencial por negocio
  previousHash: t.varchar("previous_hash", { length: 128 }), // Hash del registro anterior
  currentHash: t.varchar("current_hash", { length: 128 }).notNull(), // Hash del registro actual
  qrCode: t.text("qr_code").notNull(), // Contenido del código QR
  qrUrl: t.varchar("qr_url", { length: 500 }).notNull(), // URL del QR
  xmlContent: t.text("xml_content").notNull(), // XML completo para envío
  signedXml: t.text("signed_xml"), // XML firmado con XAdES
  transmissionStatus: t.mysqlEnum("transmission_status", ["pending", "sending", "sent", "error", "rejected"]).notNull().default("pending"),
  transmissionDate: t.datetime("transmission_date"), // Fecha de envío a AEAT
  aeatResponse: t.text("aeat_response"), // Respuesta completa de AEAT
  aeatCsv: t.varchar("aeat_csv", { length: 50 }), // CSV de confirmación AEAT
  errorMessage: t.text("error_message"), // Mensaje de error si falla
  retryCount: t.int("retry_count").default(0), // Número de reintentos
  nextRetryAt: t.datetime("next_retry_at"), // Próximo intento de envío
  isVerifiable: t.boolean("is_verifiable").default(false).notNull(), // Si es sistema VERI*FACTU
  ...timestamps,
}, (table) => [
  t.unique().on(table.businessId, table.sequenceNumber),
  t.index("idx_invoice").on(table.invoiceId),
  t.index("idx_status").on(table.transmissionStatus),
  t.index("idx_retry").on(table.nextRetryAt)
]);

// Configuración VERI*FACTU por negocio
export const verifactuConfig = table("verifactu_config", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  enabled: t.boolean("enabled").default(false).notNull(), // Si está activo VERI*FACTU
  mode: t.mysqlEnum("mode", ["verifactu", "requerimiento"]).notNull().default("verifactu"), // Modo de operación
  certificatePath: t.varchar("certificate_path", { length: 500 }), // Ruta al certificado digital (actualizada)
  certificatePasswordEncrypted: t.text("certificate_password_encrypted"), // Contraseña cifrada de forma segura
  certificateUploadedAt: t.timestamp("certificate_uploaded_at"), // Cuándo se subió el certificado
  certificateValidUntil: t.date("certificate_valid_until"), // Fecha de expiración del certificado
  environment: t.mysqlEnum("environment", ["production", "testing"]).notNull().default("testing"),
  lastSequenceNumber: t.int("last_sequence_number").default(0).notNull(), // Último número de secuencia usado
  flowControlSeconds: t.int("flow_control_seconds").default(60).notNull(), // Segundos entre envíos
  maxRecordsPerSubmission: t.int("max_records_per_submission").default(100).notNull(),
  autoSubmit: t.boolean("auto_submit").default(true).notNull(), // Envío automático
  includeInPdf: t.boolean("include_in_pdf").default(true).notNull(), // Incluir QR y leyenda en PDF
  ...timestamps,
}, (table) => [t.unique().on(table.businessId)]);

// Tabla de eventos VERI*FACTU (para auditoría detallada)
export const verifactuEvents = table("verifactu_events", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  registryId: t.varchar("registry_id", { length: 36 }).references(() => verifactuRegistry.id),
  eventType: t.varchar("event_type", { length: 50 }).notNull(), // created, signed, sent, confirmed, error
  eventData: t.text("event_data"), // Datos del evento en JSON
  createdAt: t.datetime("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [t.index("idx_registry").on(table.registryId)]);

// DEFINICIÓN DE RELACIONES
export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  bank: one(banks, {
    fields: [invoices.bankId],
    references: [banks.id],
  }),
  lines: many(invoiceLines),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  receivedInvoices: many(receivedInvoices),
}));

export const receivedInvoicesRelations = relations(receivedInvoices, ({ one, many }) => ({
  provider: one(providers, {
    fields: [receivedInvoices.providerId],
    references: [providers.id],
  }),
  project: one(projects, {
    fields: [receivedInvoices.projectId],
    references: [projects.id],
  }),
  bank: one(banks, {
    fields: [receivedInvoices.bankId],
    references: [banks.id],
  }),
  lines: many(receivedInvoiceLines),
}));

export const receivedInvoiceLinesRelations = relations(receivedInvoiceLines, ({ one }) => ({
  receivedInvoice: one(receivedInvoices, {
    fields: [receivedInvoiceLines.receivedInvoiceId],
    references: [receivedInvoices.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  invoices: many(invoices),
}));

export const invoiceAutomationsRelations = relations(invoiceAutomations, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoiceAutomations.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoiceAutomations.projectId],
    references: [projects.id],
  }),
  bank: one(banks, {
    fields: [invoiceAutomations.bankId],
    references: [banks.id],
  }),
  lines: many(automationLines),
}));

export const automationLinesRelations = relations(automationLines, ({ one }) => ({
  automation: one(invoiceAutomations, {
    fields: [automationLines.automationId],
    references: [invoiceAutomations.id],
  }),
}));

// Tipos para TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;

export type Bank = typeof banks.$inferSelect;
export type NewBank = typeof banks.$inferInsert;

export type BusinessUser = typeof businessUsers.$inferSelect;
export type NewBusinessUser = typeof businessUsers.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type InvoiceType = typeof invoiceTypes.$inferSelect;
export type NewInvoiceType = typeof invoiceTypes.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;

export type ReceivedInvoiceLine = typeof receivedInvoiceLines.$inferSelect;
export type NewReceivedInvoiceLine = typeof receivedInvoiceLines.$inferInsert;

export type ReceivedInvoiceType = typeof receivedTypes.$inferSelect;
export type NewReceivedInvoiceType = typeof receivedTypes.$inferInsert;

export type ReceivedInvoice = typeof receivedInvoices.$inferSelect;
export type NewReceivedInvoice = typeof receivedInvoices.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type InvoiceAutomation = typeof invoiceAutomations.$inferSelect;
export type NewInvoiceAutomation = typeof invoiceAutomations.$inferInsert;

export type AutomationLine = typeof automationLines.$inferSelect;
export type NewAutomationLine = typeof automationLines.$inferInsert;

export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type NewAutomationExecution = typeof automationExecutions.$inferInsert;

// Relaciones VERI*FACTU
export const verifactuRegistryRelations = relations(verifactuRegistry, ({ one, many }) => ({
  business: one(businesses, {
    fields: [verifactuRegistry.businessId],
    references: [businesses.id],
  }),
  invoice: one(invoices, {
    fields: [verifactuRegistry.invoiceId],
    references: [invoices.id],
  }),
  events: many(verifactuEvents),
}));

export const verifactuConfigRelations = relations(verifactuConfig, ({ one }) => ({
  business: one(businesses, {
    fields: [verifactuConfig.businessId],
    references: [businesses.id],
  }),
}));

export const verifactuEventsRelations = relations(verifactuEvents, ({ one }) => ({
  registry: one(verifactuRegistry, {
    fields: [verifactuEvents.registryId],
    references: [verifactuRegistry.id],
  }),
}));

// Tipos VERI*FACTU
export type VerifactuRegistry = typeof verifactuRegistry.$inferSelect;
export type NewVerifactuRegistry = typeof verifactuRegistry.$inferInsert;

export type VerifactuConfig = typeof verifactuConfig.$inferSelect;
export type NewVerifactuConfig = typeof verifactuConfig.$inferInsert;

export type VerifactuEvent = typeof verifactuEvents.$inferSelect;
export type NewVerifactuEvent = typeof verifactuEvents.$inferInsert;
