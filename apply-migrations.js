import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({
  connectionString: "postgresql://zynvio_app_0:7mP@E*5@2R6KJlnQ@B@vps-eac4c4e7.vps.ovh.net:5432/zynvio_app_0",
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  console.log("🔄 Aplicando migraciones manuales...");
  
  try {
    // Leer el archivo de migración
    const migrationSQL = fs.readFileSync('./drizzle/0000_wild_malice.sql', 'utf8');
    
    // Dividir por statements (separados por --> statement-breakpoint)
    const statements = migrationSQL.split('--> statement-breakpoint').filter(s => s.trim());
    
    console.log(`📋 Encontradas ${statements.length} declaraciones SQL`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`  Ejecutando statement ${i + 1}/${statements.length}...`);
          await pool.query(statement);
        } catch (err) {
          console.error(`  ❌ Error en statement ${i + 1}:`, err.message);
          // Continuar con las demás si una falla
        }
      }
    }
    
    console.log("✅ Migraciones aplicadas!");
    
    // Verificar tablas creadas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log("\n📊 Tablas creadas:");
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

main();