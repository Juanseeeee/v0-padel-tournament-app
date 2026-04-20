const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const torneos = await sql`
    SELECT id, nombre, categoria_id FROM fechas_torneo
    ORDER BY id DESC
    LIMIT 10
  `;
  console.log('Torneos:', torneos);
}
run().catch(console.error);