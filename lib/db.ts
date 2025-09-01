import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/app/db/schema";
import { eq } from "drizzle-orm";

// Variable para almacenar el pool de conexiones
let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Función para obtener el pool de conexiones
async function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL!;
    console.log('Database URL configured:', databaseUrl ? 'YES' : 'NO');
    
    // Determinar configuración SSL
    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    const sslConfig = isLocal ? false : {
      rejectUnauthorized: false, // Para certificados autofirmados
      requestCert: false, // No solicitar certificado del cliente
      checkServerIdentity: () => {}, // No verificar identidad del servidor (función vacía)
      ca: undefined, // No verificar CA
      secureProtocol: 'TLSv1_2_method' // Usar TLS 1.2 específicamente
    };
    
    console.log('SSL Config:', isLocal ? 'DISABLED (local)' : 'ENABLED (remote with self-signed)');
    
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      // Configuraciones adicionales para mejorar la conectividad
      max: 20, // Máximo número de clientes en el pool
      idleTimeoutMillis: 30000, // Cerrar clientes inactivos después de 30 segundos
      connectionTimeoutMillis: 10000, // Timeout de conexión de 10 segundos
    });
    
    // Manejar errores del pool
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  return pool;
}

// Función para obtener la instancia de Drizzle
export async function getDb() {
  if (!dbInstance) {
    const pgPool = await getPool();
    dbInstance = drizzle(pgPool, { schema });
  }
  return dbInstance;
}

// Exportar el esquema para uso en otros archivos
export { schema };
export { userPermissions } from "@/app/db/schema";
export type { UserPermission, NewUserPermission } from "@/app/db/schema";

// Función para cerrar la conexión (útil para tests)
export async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

// Función para obtener los negocios de un usuario (usando Drizzle)
export async function getBusinessesForUser(userId: string) {
  console.log(`[getBusinessesForUser] Buscando negocios para el usuario: ${userId}`);

  try {
    const db = await getDb();
    
    // Primero, obtenemos las relaciones usuario-negocio
    const businessUsers = await db.query.businessUsers.findMany({
      where: (businessUsers, { eq }) => eq(businessUsers.userId, userId),
    });

    console.log(`[getBusinessesForUser] Relaciones encontradas: ${businessUsers.length}`);

    // Si no hay relaciones, devolvemos un array vacío
    if (!businessUsers.length) {
      return [];
    }

    // Obtenemos los IDs de los negocios
    const businessIds = businessUsers.map((bu) => bu.businessId);
    console.log(`[getBusinessesForUser] IDs de negocios: ${businessIds.join(", ")}`);

    // Para cada ID, buscamos el negocio correspondiente
    const businesses = [];

    for (const businessId of businessIds) {
      const business = await db.query.businesses.findFirst({
        where: (businesses, { eq }) => eq(businesses.id, businessId),
      });

      if (business) {
        // Encontramos el rol del usuario en este negocio
        const businessUser = businessUsers.find((bu) => bu.businessId === businessId);

        businesses.push({
          ...business,
          role: businessUser?.role || "user",
        });
      }
    }

    console.log(`[getBusinessesForUser] Negocios encontrados: ${businesses.length}`);
    return businesses;
  } catch (error) {
    console.error("[getBusinessesForUser] Error:", error);
    return [];
  }
}
