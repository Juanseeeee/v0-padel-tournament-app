const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const hp = await sql`SELECT DISTINCT motivo FROM historial_puntos WHERE fecha_torneo_id = 63`;
  console.log('Torneo 63 motivos:', hp);
  
  const hps = await sql`SELECT jugador_id, motivo, puntos_acumulados FROM historial_puntos WHERE fecha_torneo_id = 63`;
  console.log('Torneo 63 puntos:', hps.slice(0, 10));
}
run().catch(console.error);