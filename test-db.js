import pg from 'pg';
const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Para certificados autofirmados
    }
  });
  const result = await pool.query('SELECT current_database() as db');
  console.log('Conectado a:', result.rows[0].db);
  await pool.end();
}

main().catch(console.error); 