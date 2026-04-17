const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const p = await sql`SELECT DISTINCT motivo FROM historial_puntos`;
  console.log(p);
}
run().catch(console.error);