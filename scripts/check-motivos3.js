const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const hp = await sql`SELECT COUNT(*) FROM historial_puntos WHERE motivo LIKE 'Fecha 1 - %'`;
  console.log(hp);
}
run().catch(console.error);