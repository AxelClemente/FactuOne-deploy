import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: "postgresql://zynvio_app_0:7mP@E*5@2R6KJlnQ@B@vps-eac4c4e7.vps.ovh.net:5432/zynvio_app_0",
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

async function main() {
  console.log("🔄 Aplicando migraciones...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("✅ Migraciones aplicadas exitosamente!");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error aplicando migraciones:", err);
  process.exit(1);
});