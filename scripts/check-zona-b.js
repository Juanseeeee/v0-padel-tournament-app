const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const zonaId = 420; // Zona B

  const parejas = await sql`
    SELECT 
      pz.pareja_id,
      pz.posicion_final,
      pz.partidos_ganados,
      pz.partidos_perdidos,
      pz.sets_ganados,
      pz.sets_perdidos,
      pz.games_ganados,
      pz.games_perdidos,
      j1.apellido as j1_apellido,
      j2.apellido as j2_apellido
    FROM parejas_zona pz
    JOIN parejas_torneo pt ON pt.id = pz.pareja_id
    JOIN jugadores j1 ON j1.id = pt.jugador1_id
    JOIN jugadores j2 ON j2.id = pt.jugador2_id
    WHERE pz.zona_id = ${zonaId}
    ORDER BY pz.posicion_final
  `;
  console.log('Parejas Zona B:', parejas);
}
run().catch(console.error);