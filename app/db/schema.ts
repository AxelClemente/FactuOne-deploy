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
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
}, (table) => [t.unique().on(table.nif)]);

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
  phone: t.varchar("phone", { length: 20 }).notNull(),
  email: t.varchar("email", { length: 255 }).notNull(),
  isDeleted: t.boolean("is_deleted").default(false).notNull(),
  ...timestamps,
});

// ReceivedInvoices (Facturas Recibidas)
export const receivedInvoices = table("received_invoices", {
  ...stringId,
  businessId: t.varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  providerId: t.varchar("provider_id", { length: 36 }).references(() => providers.id),
  typeId: t.varchar("received_invoice_type_id", { length: 36 }).references(() => receivedTypes.id),
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

// DEFINICIÓN DE RELACIONES
export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
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

export const receivedInvoicesRelations = relations(receivedInvoices, ({ one }) => ({
  provider: one(providers, {
    fields: [receivedInvoices.providerId],
    references: [providers.id],
  }),
}));

// Tipos para TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;

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

export type ReceivedInvoiceType = typeof receivedTypes.$inferSelect;
export type NewReceivedInvoiceType = typeof receivedTypes.$inferInsert;

export type ReceivedInvoice = typeof receivedInvoices.$inferSelect;
export type NewReceivedInvoice = typeof receivedInvoices.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
