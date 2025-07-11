import { getDb } from "@/lib/db";
import { auditLogs, type NewAuditLog, users } from "@/app/db/schema";
import { getCurrentUser } from "./auth";
import { getActiveBusiness } from "./getActiveBusiness";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// Tipos de acciones de auditoría
export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'download' 
  | 'view' 
  | 'login' 
  | 'logout' 
  | 'status_change'
  | 'permission_change';

// Tipos de módulos
export type AuditModule = 
  | 'invoices' 
  | 'received_invoices' 
  | 'clients' 
  | 'providers' 
  | 'projects' 
  | 'users' 
  | 'businesses' 
  | 'auth' 
  | 'system';

// Tipos de entidades
export type AuditEntityType = 
  | 'invoice' 
  | 'received_invoice' 
  | 'client' 
  | 'provider' 
  | 'project' 
  | 'user' 
  | 'business';

// Interfaz para detalles de auditoría
export interface AuditDetails {
  [key: string]: any;
}

/**
 * Registra un evento de auditoría
 */
export async function logAuditEvent(
  action: AuditAction,
  module: AuditModule,
  entityId?: string,
  entityType?: AuditEntityType,
  details?: AuditDetails,
  request?: Request
): Promise<void> {
  try {
    const user = await getCurrentUser();
    const businessId = await getActiveBusiness();
    
    if (!businessId) {
      console.warn('No se pudo obtener businessId para auditoría');
      return;
    }

    // Obtener información del request si está disponible
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      ipAddress = forwarded?.split(',')[0] || realIp || 'unknown';
      userAgent = request.headers.get('user-agent') || 'unknown';
    }

    const auditLog: NewAuditLog = {
      id: crypto.randomUUID(),
      businessId,
      userId: user?.id,
      action,
      module,
      entityId,
      entityType,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
    };

    const db = await getDb();
    await db.insert(auditLogs).values(auditLog);
    
    console.log(`🔍 AUDIT: ${action} on ${module}${entityId ? ` (${entityId})` : ''}`);
  } catch (error) {
    console.error('Error registrando evento de auditoría:', error);
    // No lanzamos el error para no interrumpir el flujo principal
  }
}

/**
 * Obtiene logs de auditoría para un negocio
 */
export async function getAuditLogs(
  businessId: string,
  options: {
    module?: AuditModule;
    action?: AuditAction;
    entityId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
): Promise<any[]> {
  const {
    module,
    action,
    entityId,
    userId,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = options;

  const db = await getDb();
  let query = db
    .select({
      ...auditLogs,
      userName: users.name,
      userEmail: users.email
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.businessId, businessId));

  if (module) {
    query = query.where(eq(auditLogs.module, module));
  }
  if (action) {
    query = query.where(eq(auditLogs.action, action));
  }
  if (entityId) {
    query = query.where(eq(auditLogs.entityId, entityId));
  }
  if (userId) {
    query = query.where(eq(auditLogs.userId, userId));
  }
  if (startDate) {
    query = query.where(gte(auditLogs.createdAt, startDate));
  }
  if (endDate) {
    query = query.where(lte(auditLogs.createdAt, endDate));
  }

  return await query
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Obtiene logs de auditoría para una entidad específica
 */
export async function getEntityAuditLogs(
  businessId: string,
  entityId: string,
  entityType: AuditEntityType
): Promise<any[]> {
  return await getAuditLogs(businessId, {
    entityId,
    limit: 50
  });
}

/**
 * Obtiene estadísticas de auditoría para un negocio
 */
export async function getAuditStats(businessId: string): Promise<{
  totalLogs: number;
  todayLogs: number;
  topActions: { action: string; count: number }[];
  topModules: { module: string; count: number }[];
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalLogs, todayLogs] = await Promise.all([
    (await getDb()).select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.businessId, businessId)),
    
    (await getDb()).select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.businessId, businessId),
        gte(auditLogs.createdAt, today)
      ))
  ]);

  const topActions = await (await getDb())
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)`
    })
    .from(auditLogs)
    .where(eq(auditLogs.businessId, businessId))
    .groupBy(auditLogs.action)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const topModules = await (await getDb())
    .select({
      module: auditLogs.module,
      count: sql<number>`count(*)`
    })
    .from(auditLogs)
    .where(eq(auditLogs.businessId, businessId))
    .groupBy(auditLogs.module)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  return {
    totalLogs: totalLogs[0]?.count || 0,
    todayLogs: todayLogs[0]?.count || 0,
    topActions: topActions.map(row => ({
      action: row.action,
      count: Number(row.count)
    })),
    topModules: topModules.map(row => ({
      module: row.module,
      count: Number(row.count)
    }))
  };
}

// Funciones helper para casos específicos
export const auditHelpers = {
  // Facturas emitidas
  logInvoiceCreated: (invoiceId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('create', 'invoices', invoiceId, 'invoice', details, request),
  
  logInvoiceUpdated: (invoiceId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('update', 'invoices', invoiceId, 'invoice', details, request),
  
  logInvoiceDownloaded: (invoiceId: string, format: 'pdf' | 'xml', request?: Request) =>
    logAuditEvent('download', 'invoices', invoiceId, 'invoice', { format }, request),
  
  logInvoiceStatusChanged: (invoiceId: string, oldStatus: string, newStatus: string, request?: Request) =>
    logAuditEvent('status_change', 'invoices', invoiceId, 'invoice', { oldStatus, newStatus }, request),

  // Facturas recibidas
  logReceivedInvoiceCreated: (invoiceId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('create', 'received_invoices', invoiceId, 'received_invoice', details, request),
  
  logReceivedInvoiceUpdated: (invoiceId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('update', 'received_invoices', invoiceId, 'received_invoice', details, request),
  
  logReceivedInvoiceDownloaded: (invoiceId: string, format: 'pdf' | 'xml', request?: Request) =>
    logAuditEvent('download', 'received_invoices', invoiceId, 'received_invoice', { format }, request),

  // Clientes
  logClientCreated: (clientId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('create', 'clients', clientId, 'client', details, request),
  
  logClientUpdated: (clientId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('update', 'clients', clientId, 'client', details, request),

  // Proveedores
  logProviderCreated: (providerId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('create', 'providers', providerId, 'provider', details, request),
  
  logProviderUpdated: (providerId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('update', 'providers', providerId, 'provider', details, request),

  // Proyectos
  logProjectCreated: (projectId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('create', 'projects', projectId, 'project', details, request),
  
  logProjectUpdated: (projectId: string, details?: AuditDetails, request?: Request) =>
    logAuditEvent('update', 'projects', projectId, 'project', details, request),

  // Autenticación
  logUserLogin: (userId: string, request?: Request) =>
    logAuditEvent('login', 'auth', userId, 'user', undefined, request),
  
  logUserLogout: (userId: string, request?: Request) =>
    logAuditEvent('logout', 'auth', userId, 'user', undefined, request),
}; 