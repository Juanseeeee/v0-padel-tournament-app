const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const JUG = 508;   // MARINA LEAVY
const CAT_7MA = 30;
const CAT_6TA = 32;

async function snapshot(label) {
  console.log(`\n===== ${label} =====`);
  const pc = await sql`SELECT categoria_id, puntos_acumulados, torneos_jugados, mejor_resultado FROM puntos_categoria WHERE jugador_id = ${JUG} ORDER BY categoria_id`;
  console.log('puntos_categoria:', pc);
  const asc = await sql`SELECT id, categoria_origen_id, categoria_destino_id, puntos_origen, puntos_transferidos FROM ascensos WHERE jugador_id = ${JUG} ORDER BY id`;
  console.log('ascensos:', asc);
  const hp = await sql`SELECT id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo FROM historial_puntos WHERE jugador_id = ${JUG} ORDER BY categoria_id, id`;
  console.log('historial_puntos:', hp);
  const jt = await sql`SELECT puntos_totales, categoria_actual_id FROM jugadores WHERE id = ${JUG}`;
  console.log('jugadores:', jt);
}

async function run() {
  await snapshot('ANTES');

  console.log('\n>>> Aplicando correccion...');

  // 1) ASCENSOS: dejar un unico ascenso limpio 7MA -> 6TA de 160.
  //    - id=55 (arrastre 110 prematuro) -> eliminar
  //    - id=56 (7MA->7MA bogus 160)      -> eliminar
  //    - id=57 (7MA->6TA 240 inflado)    -> corregir a origen=320, transferidos=160
  await sql`DELETE FROM ascensos WHERE id = 55 AND jugador_id = ${JUG}`;
  await sql`DELETE FROM ascensos WHERE id = 56 AND jugador_id = ${JUG}`;
  await sql`
    UPDATE ascensos
    SET categoria_origen_id = ${CAT_7MA},
        categoria_destino_id = ${CAT_6TA},
        puntos_origen = 320,
        puntos_transferidos = 160
    WHERE id = 57 AND jugador_id = ${JUG}
  `;

  // 2) HISTORIAL_PUNTOS
  //    - id=1424 (7MA bogus +160 "por ascenso")   -> eliminar
  //    - id=1425 (6TA bogus +240 "por ascenso")   -> eliminar
  //    - id=1392 (6TA +50 "torneo anterior")       -> eliminar (queda incluido en el 160 consolidado)
  //    - id=1386 (6TA +110 "por ascenso")          -> corregir a 160
  await sql`DELETE FROM historial_puntos WHERE id = 1424 AND jugador_id = ${JUG}`;
  await sql`DELETE FROM historial_puntos WHERE id = 1425 AND jugador_id = ${JUG}`;
  await sql`DELETE FROM historial_puntos WHERE id = 1392 AND jugador_id = ${JUG}`;
  await sql`UPDATE historial_puntos SET puntos_acumulados = 160 WHERE id = 1386 AND jugador_id = ${JUG}`;

  // 3) PUNTOS_CATEGORIA (recalculo directo con valores conocidos)
  //    7MA: 320 (participaciones reales, sin arrastre)
  //    6TA: 160 (arrastre consolidado)
  await sql`UPDATE puntos_categoria SET puntos_acumulados = 320, updated_at = NOW() WHERE jugador_id = ${JUG} AND categoria_id = ${CAT_7MA}`;
  await sql`UPDATE puntos_categoria SET puntos_acumulados = 160, updated_at = NOW() WHERE jugador_id = ${JUG} AND categoria_id = ${CAT_6TA}`;

  // 4) PUNTOS_TOTALES: resincronizar como suma de puntos_categoria
  await sql`
    UPDATE jugadores j
    SET puntos_totales = COALESCE((SELECT SUM(puntos_acumulados) FROM puntos_categoria WHERE jugador_id = ${JUG}), 0),
        updated_at = NOW()
    WHERE j.id = ${JUG}
  `;

  await snapshot('DESPUES');
}
run().catch(e => { console.error(e); process.exit(1); });
