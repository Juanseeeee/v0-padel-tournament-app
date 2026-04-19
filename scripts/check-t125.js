const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const torneoId = 125;
  const zonas = await sql`
    SELECT z.id, z.nombre, z.estado 
    FROM zonas z
    WHERE z.fecha_torneo_id = ${torneoId} AND z.nombre = 'Zona A'
  `;
  console.log('Zonas A:', zonas);

  if (zonas.length > 0) {
    const zonaId = zonas[0].id;
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
    console.log('Parejas Zona A:', parejas);
  }

  // Check llaves for tournament 125
  const llaves = await sql`
    SELECT l.id, l.ronda, l.posicion, l.pareja1_id, l.pareja2_id, l.p1_seed, l.p2_seed
    FROM llaves l
    WHERE l.fecha_torneo_id = ${torneoId}
  `;
  console.log('Llaves sample:', llaves.slice(0, 10));
}
run().catch(console.error);