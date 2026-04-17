const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const p = await sql`SELECT jugador_id, instancia_alcanzada, puntos_obtenidos FROM participaciones WHERE fecha_torneo_id = 63 AND jugador_id IN (363, 371, 519, 544, 567, 568, 624, 627, 629, 671, 672, 673, 674, 681, 686, 687, 688, 690)`;
  console.log(p);
}
run().catch(console.error);