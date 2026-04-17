const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const torneoId = 63;
  const llaves = await sql`
    SELECT l.*, pt1.jugador1_id as p1_j1, pt1.jugador2_id as p1_j2, pt2.jugador1_id as p2_j1, pt2.jugador2_id as p2_j2 
    FROM llaves l 
    LEFT JOIN parejas_torneo pt1 ON pt1.id = l.pareja1_id 
    LEFT JOIN parejas_torneo pt2 ON pt2.id = l.pareja2_id 
    WHERE l.fecha_torneo_id = ${torneoId} 
    ORDER BY l.ronda
  `;
  console.log("Llaves:");
  for (const l of llaves) {
      console.log(`- ${l.ronda} Pos ${l.posicion}: Pareja1=${l.pareja1_id}, Pareja2=${l.pareja2_id}, Ganador=${l.ganador_id}, Estado=${l.estado}`);
  }
}
run().catch(console.error);