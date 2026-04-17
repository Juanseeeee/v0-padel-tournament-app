const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const jugadorIds = [624, 688, 519, 629];
  const oldPoints = 10;
  const newPoints = 60;
  const diff = newPoints - oldPoints;
  const torneoId = 63;
  const categoriaId = 25; // 6ta Masc

  console.log("Fixing points for players:", jugadorIds);

  for (const jid of jugadorIds) {
    // 1. Update participaciones
    await sql`
      UPDATE participaciones 
      SET instancia_alcanzada = 'semifinalista', puntos_obtenidos = ${newPoints}
      WHERE jugador_id = ${jid} AND fecha_torneo_id = ${torneoId}
    `;

    // 2. Update historial_puntos
    await sql`
      UPDATE historial_puntos
      SET puntos_acumulados = ${newPoints}, motivo = 'semifinalista'
      WHERE jugador_id = ${jid} AND fecha_torneo_id = ${torneoId} AND categoria_id = ${categoriaId}
    `;

    // 3. Update puntos_categoria
    await sql`
      UPDATE puntos_categoria
      SET puntos_acumulados = puntos_acumulados + ${diff},
          mejor_resultado = CASE 
            WHEN mejor_resultado IN ('zona', '16avos', 'octavofinalista', 'cuartofinalista') THEN 'semifinalista'
            WHEN mejor_resultado IS NULL THEN 'semifinalista'
            ELSE mejor_resultado
          END
      WHERE jugador_id = ${jid} AND categoria_id = ${categoriaId}
    `;

    // 4. Update jugadores puntos_totales
    await sql`
      UPDATE jugadores
      SET puntos_totales = puntos_totales + ${diff}
      WHERE id = ${jid}
    `;

    console.log(`Updated player ${jid}: added +${diff} points.`);
  }
}
run().catch(console.error);