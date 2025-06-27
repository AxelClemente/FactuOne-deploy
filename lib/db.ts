import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/app/db/schema";
import { eq } from "drizzle-orm";

// Variable para almacenar la conexión
let connection: mysql.Connection | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Función para obtener la conexión a la base de datos
async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection(process.env.DATABASE_URL!);
  }
  return connection;
}

// Función para obtener la instancia de Drizzle
export async function getDb() {
  if (!dbInstance) {
    const conn = await getConnection();
    dbInstance = drizzle(conn, { schema, mode: "default" });
  }
  return dbInstance;
}

// Exportar el esquema para uso en otros archivos
export { schema };

// Función para cerrar la conexión (útil para tests)
export async function closeConnection() {
  if (connection) {
    await connection.end();
    connection = null;
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
