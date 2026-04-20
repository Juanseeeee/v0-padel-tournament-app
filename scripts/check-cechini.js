const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const p1 = 893;
  const p2 = 760;

  // Find pareja
  const pareja = await sql`
    SELECT id FROM parejas_torneo WHERE (jugador1_id = ${p1} AND jugador2_id = ${p2}) OR (jugador1_id = ${p2} AND jugador2_id = ${p1})
  `;
  console.log('Pareja:', pareja);

  if (pareja.length > 0) {
    const parejaId = pareja[0].id;
    // Find zona and tournament
    const zonaInfo = await sql`
      SELECT pz.posicion_final, pz.partidos_ganados, pz.sets_ganados, pz.games_ganados, z.id as zona_id, z.nombre as zona_nombre, z.fecha_torneo_id
      FROM parejas_zona pz
      JOIN zonas z ON z.id = pz.zona_id
      WHERE pz.pareja_id = ${parejaId}
    `;
    console.log('Zona Info:', zonaInfo);
    
    if (zonaInfo.length > 0) {
        const torneoId = zonaInfo[0].fecha_torneo_id;
        const llaves = await sql`
            SELECT id, ronda, posicion, pareja1_id, pareja2_id, p1_seed, p2_seed
            FROM llaves
            WHERE fecha_torneo_id = ${torneoId} AND (pareja1_id = ${parejaId} OR pareja2_id = ${parejaId})
        `;
        console.log('Llaves for pareja:', llaves);
    }
  }
}
run().catch(console.error);