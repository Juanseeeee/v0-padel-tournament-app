import { config } from 'dotenv';
config({ path: '.env.local' });

import { sql } from '../lib/db';

async function run() {
  try {
    console.log("--- JUGADORES ---");
    const jugadores = await sql`
      SELECT id, nombre, apellido, categoria_actual_id
      FROM jugadores
      WHERE (nombre ILIKE '%AGUST%N%' AND apellido ILIKE '%ULLUA%')
         OR (nombre ILIKE '%HERNAN%' AND apellido ILIKE '%GHERPELLI%')
         OR (nombre ILIKE '%LAUTARO%' AND apellido ILIKE '%DE LEON%')
         OR (nombre ILIKE '%NICOLAS%' AND apellido ILIKE '%DUCASSE%')
    `;
    console.log(jugadores);

    if (jugadores.length > 0) {
      const ids = jugadores.map(j => j.id);
      
      console.log("\n--- PUNTOS ACTUALES EN RANKING ---");
      const ranking = await sql`
        SELECT jugador_id, categoria_id, puntos_acumulados 
        FROM ranking_categorias 
        WHERE jugador_id IN ${sql(ids)}
      `;
      console.log(ranking);

      console.log("\n--- PARTICIPACIONES ---");
      const participaciones = await sql`
        SELECT * FROM participaciones WHERE jugador_id IN ${sql(ids)}
      `;
      console.log(participaciones);

      console.log("\n--- HISTORIAL PUNTOS ---");
      const historial = await sql`
        SELECT * FROM historial_puntos WHERE jugador_id IN ${sql(ids)}
      `;
      console.log(historial);

      console.log("\n--- ASCENSOS ---");
      const ascensos = await sql`
        SELECT * FROM ascensos WHERE jugador_id IN ${sql(ids)}
      `;
      console.log(ascensos);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
