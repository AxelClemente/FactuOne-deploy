import mysql from 'mysql2/promise';
import { Pool } from 'pg';

// Configuración de conexiones
const mysqlConfig = {
  host: '37.59.125.76',
  port: 3306,
  user: 'factuuser',
  password: 'F0rd@Rapt0r',
  database: 'factuone'
};

const pgPool = new Pool({
  connectionString: "postgresql://zynvio_app_0:7mP@E*5@2R6KJlnQ@B@vps-eac4c4e7.vps.ovh.net:5432/zynvio_app_0",
  ssl: {
    rejectUnauthorized: false
  }
});

// Orden de las tablas (respetando foreign keys)
const tablesOrder = [
  'users',
  'businesses',
  'business_users',
  'banks',
  'clients',
  'providers',
  'invoice_types',
  'received_invoice_types',
  'projects',
  'invoices',
  'invoice_lines',
  'received_invoices',
  'received_invoice_lines',
  'notifications',
  'user_permissions',
  'user_module_exclusions',
  'audit_logs',
  'invoice_automations',
  'automation_lines',
  'automation_executions',
  'verifactu_config',
  'verifactu_registry',
  'verifactu_events'
];

async function migrateTable(mysqlConn, tableName) {
  console.log(`\n📋 Migrando tabla: ${tableName}`);
  
  try {
    // Obtener datos de MySQL
    const [rows] = await mysqlConn.query(`SELECT * FROM ${tableName}`);
    console.log(`  Encontrados ${rows.length} registros`);
    
    if (rows.length === 0) {
      console.log(`  ⚪ Tabla vacía, saltando...`);
      return { table: tableName, success: true, count: 0 };
    }
    
    // Obtener columnas de la tabla en PostgreSQL
    const pgColumns = await pgPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [tableName]);
    
    const columnNames = pgColumns.rows.map(r => r.column_name);
    
    // Insertar datos en PostgreSQL
    let inserted = 0;
    for (const row of rows) {
      try {
        // Filtrar solo las columnas que existen en PostgreSQL
        const values = [];
        const placeholders = [];
        const columns = [];
        let paramIndex = 1;
        
        for (const col of columnNames) {
          if (row.hasOwnProperty(col) || row.hasOwnProperty(col.replace(/_/g, ''))) {
            // Manejar nombres de columnas con/sin underscore
            const sourceCol = row.hasOwnProperty(col) ? col : col.replace(/_/g, '');
            columns.push(`"${col}"`);
            placeholders.push(`$${paramIndex++}`);
            
            // Convertir valores para PostgreSQL
            let value = row[sourceCol];
            
            // Convertir fechas MySQL a PostgreSQL
            if (value instanceof Date) {
              value = value.toISOString();
            }
            // Convertir boolean de MySQL (0/1) a PostgreSQL (true/false)
            else if (col.includes('is_') || col === 'enabled' || col === 'isDeleted') {
              value = value === 1 || value === true;
            }
            // Manejar NULL
            else if (value === null || value === undefined) {
              value = null;
            }
            
            values.push(value);
          }
        }
        
        if (columns.length > 0) {
          const insertQuery = `
            INSERT INTO "${tableName}" (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            ON CONFLICT DO NOTHING
          `;
          
          await pgPool.query(insertQuery, values);
          inserted++;
        }
      } catch (err) {
        console.error(`  ⚠️ Error insertando registro:`, err.message);
      }
    }
    
    console.log(`  ✅ Insertados ${inserted}/${rows.length} registros`);
    return { table: tableName, success: true, count: inserted };
    
  } catch (err) {
    console.error(`  ❌ Error migrando tabla ${tableName}:`, err.message);
    return { table: tableName, success: false, error: err.message };
  }
}

async function main() {
  console.log('🚀 Iniciando migración de datos MySQL → PostgreSQL\n');
  
  let mysqlConn;
  const results = [];
  
  try {
    // Conectar a MySQL
    console.log('📡 Conectando a MySQL...');
    mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL');
    
    // Verificar conexión a PostgreSQL
    console.log('📡 Verificando conexión a PostgreSQL...');
    await pgPool.query('SELECT 1');
    console.log('✅ Conectado a PostgreSQL');
    
    // Migrar cada tabla en orden
    for (const table of tablesOrder) {
      const result = await migrateTable(mysqlConn, table);
      results.push(result);
    }
    
    // Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(50));
    
    let totalRecords = 0;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n✅ Tablas migradas exitosamente:');
    for (const r of successful) {
      if (r.count > 0) {
        console.log(`  - ${r.table}: ${r.count} registros`);
        totalRecords += r.count;
      }
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Tablas con errores:');
      for (const r of failed) {
        console.log(`  - ${r.table}: ${r.error}`);
      }
    }
    
    console.log(`\n📈 Total: ${totalRecords} registros migrados`);
    console.log('✨ Migración completada');
    
  } catch (err) {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  } finally {
    if (mysqlConn) await mysqlConn.end();
    await pgPool.end();
  }
}

// Ejecutar migración
main().catch(console.error);