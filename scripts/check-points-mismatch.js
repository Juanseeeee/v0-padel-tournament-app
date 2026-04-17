const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const hp = await sql`
    SELECT hp.jugador_id, hp.fecha_torneo_id, hp.motivo, hp.puntos_acumulados, j.nombre, j.apellido
    FROM historial_puntos hp
    JOIN jugadores j ON hp.jugador_id = j.id
    WHERE hp.motivo = 'semifinalista' AND hp.puntos_acumulados != 60
  `;
  console.log('Semifinalistas with wrong points:', hp);

  const hp2 = await sql`
    SELECT hp.jugador_id, hp.fecha_torneo_id, hp.motivo, hp.puntos_acumulados, j.nombre, j.apellido
    FROM historial_puntos hp
    JOIN jugadores j ON hp.jugador_id = j.id
    WHERE hp.motivo = 'cuartofinalista' AND hp.puntos_acumulados != 40
  `;
  console.log('Cuartofinalistas with wrong points:', hp2);

  const hp3 = await sql`
    SELECT hp.jugador_id, hp.fecha_torneo_id, hp.motivo, hp.puntos_acumulados, j.nombre, j.apellido
    FROM historial_puntos hp
    JOIN jugadores j ON hp.jugador_id = j.id
    WHERE hp.motivo = 'finalista' AND hp.puntos_acumulados != 80
  `;
  console.log('Finalistas with wrong points:', hp3);

  const hp4 = await sql`
    SELECT hp.jugador_id, hp.fecha_torneo_id, hp.motivo, hp.puntos_acumulados, j.nombre, j.apellido
    FROM historial_puntos hp
    JOIN jugadores j ON hp.jugador_id = j.id
    WHERE hp.motivo = 'campeon' AND hp.puntos_acumulados != 100
  `;
  console.log('Campeones with wrong points:', hp4);
}
run().catch(console.error);