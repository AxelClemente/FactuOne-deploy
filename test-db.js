import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.query('SELECT DATABASE() as db');
  console.log('Conectado a:', rows[0].db);
  await conn.end();
}

main().catch(console.error); 