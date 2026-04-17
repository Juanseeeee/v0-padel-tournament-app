const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const torneoId = 63;
  const categoriaId = 25;

  const llaves = await sql`
    SELECT l.*, 
      pt1.jugador1_id as p1_j1, pt1.jugador2_id as p1_j2,
      pt2.jugador1_id as p2_j1, pt2.jugador2_id as p2_j2
    FROM llaves l
    LEFT JOIN parejas_torneo pt1 ON pt1.id = l.pareja1_id
    LEFT JOIN parejas_torneo pt2 ON pt2.id = l.pareja2_id
    WHERE l.fecha_torneo_id = ${torneoId}
      AND l.categoria_id = ${categoriaId}
    ORDER BY 
      CASE l.ronda 
        WHEN 'final' THEN 5 
        WHEN 'semis' THEN 4 
        WHEN '4tos' THEN 3 
        WHEN '8vos' THEN 2 
        WHEN '16avos' THEN 1 
      END DESC
  `;

  console.log(typeof llaves[0].ganador_id, typeof llaves[0].pareja1_id);
}
run().catch(console.error);