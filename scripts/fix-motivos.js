const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const result = await sql`
    UPDATE historial_puntos
    SET motivo = REPLACE(motivo, 'Fecha 1 - ', '')
    WHERE motivo LIKE 'Fecha 1 - %'
    RETURNING jugador_id, motivo;
  `;
  console.log(`Updated ${result.length} rows. Example:`, result.slice(0, 5));
}
run().catch(console.error);