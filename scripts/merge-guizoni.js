const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const REAL = 892;   // FACUNDO GUIZONI (cuenta real)
const DUP = 1093;   // FACUNDO GHIZZONI GHIZZONI (duplicado)

const RANK = { campeon:6, finalista:5, semifinalista:4, cuartofinalista:3, octavofinalista:2, '16avos':1, zona:0 };
const NAME = Object.fromEntries(Object.entries(RANK).map(([k,v])=>[v,k]));

async function snapshot(label) {
  console.log(`\n===== ${label} =====`);
  for (const id of [REAL, DUP]) {
    const j = (await sql`SELECT id,nombre,apellido,estado,puntos_totales FROM jugadores WHERE id=${id}`)[0];
    console.log(`jugador ${id}: ${j.nombre} ${j.apellido} | estado=${j.estado} | totales=${j.puntos_totales}`);
    console.log('  puntos_categoria:', await sql`SELECT categoria_id,puntos_acumulados,torneos_jugados,mejor_resultado FROM puntos_categoria WHERE jugador_id=${id} ORDER BY categoria_id`);
    console.log('  jugador_categorias:', (await sql`SELECT categoria_id FROM jugador_categorias WHERE jugador_id=${id} ORDER BY categoria_id`).map(r=>r.categoria_id));
    console.log('  participaciones:', (await sql`SELECT fecha_torneo_id,categoria_id,puntos_obtenidos,instancia_alcanzada FROM participaciones WHERE jugador_id=${id} ORDER BY categoria_id,fecha_torneo_id`));
    console.log('  usuarios:', await sql`SELECT id,email FROM usuarios WHERE jugador_id=${id}`);
  }
}

async function recomputeCategory(jugadorId, categoriaId) {
  const rows = await sql`
    SELECT SUM(puntos_obtenidos) AS pts, COUNT(*) AS n,
           MAX(CASE instancia_alcanzada
             WHEN 'campeon' THEN 6 WHEN 'finalista' THEN 5 WHEN 'semifinalista' THEN 4
             WHEN 'cuartofinalista' THEN 3 WHEN 'octavofinalista' THEN 2 WHEN '16avos' THEN 1 ELSE 0 END) AS rank
    FROM participaciones WHERE jugador_id=${jugadorId} AND categoria_id=${categoriaId}`;
  const r = rows[0];
  const pts = Number(r.pts || 0), n = Number(r.n || 0), mejor = r.rank === null ? null : NAME[Number(r.rank)];
  const existing = await sql`SELECT id FROM puntos_categoria WHERE jugador_id=${jugadorId} AND categoria_id=${categoriaId}`;
  if (existing.length > 0) {
    await sql`UPDATE puntos_categoria SET puntos_acumulados=${pts}, torneos_jugados=${n}, mejor_resultado=${mejor}, updated_at=NOW() WHERE id=${existing[0].id}`;
  } else {
    await sql`INSERT INTO puntos_categoria (jugador_id,categoria_id,puntos_acumulados,torneos_jugados,mejor_resultado) VALUES (${jugadorId},${categoriaId},${pts},${n},${mejor})`;
  }
  console.log(`  recomputado cat ${categoriaId}: pts=${pts} torneos=${n} mejor=${mejor}`);
}

async function run() {
  await snapshot('ANTES');
  console.log('\n>>> Fusionando ' + DUP + ' -> ' + REAL + ' ...');

  // 1) Mover datos de torneo del duplicado a la cuenta real
  await sql`UPDATE participaciones SET jugador_id=${REAL} WHERE jugador_id=${DUP}`;
  await sql`UPDATE historial_puntos SET jugador_id=${REAL} WHERE jugador_id=${DUP}`;
  await sql`UPDATE parejas_torneo SET jugador1_id=${REAL} WHERE jugador1_id=${DUP}`;
  await sql`UPDATE parejas_torneo SET jugador2_id=${REAL} WHERE jugador2_id=${DUP}`;

  // 2) Mover el login a la cuenta real
  await sql`UPDATE usuarios SET jugador_id=${REAL} WHERE jugador_id=${DUP}`;

  // 3) Categorias: asegurar que la real tenga todas las del duplicado, luego limpiar el duplicado
  await sql`
    INSERT INTO jugador_categorias (jugador_id, categoria_id)
    SELECT ${REAL}, jc.categoria_id FROM jugador_categorias jc
    WHERE jc.jugador_id=${DUP}
      AND NOT EXISTS (SELECT 1 FROM jugador_categorias x WHERE x.jugador_id=${REAL} AND x.categoria_id=jc.categoria_id)
  `;
  await sql`DELETE FROM jugador_categorias WHERE jugador_id=${DUP}`;

  // 4) Recalcular puntos_categoria de la cuenta real (para cada categoria que tenga participaciones)
  const cats = await sql`SELECT DISTINCT categoria_id FROM participaciones WHERE jugador_id=${REAL} ORDER BY categoria_id`;
  for (const c of cats) await recomputeCategory(REAL, c.categoria_id);

  // 5) Limpiar puntos_categoria del duplicado y desactivarlo
  await sql`DELETE FROM puntos_categoria WHERE jugador_id=${DUP}`;

  // 6) puntos_totales de la real = suma de puntos_categoria
  await sql`
    UPDATE jugadores SET puntos_totales = COALESCE((SELECT SUM(puntos_acumulados) FROM puntos_categoria WHERE jugador_id=${REAL}),0), updated_at=NOW()
    WHERE id=${REAL}`;

  // 7) Desactivar el duplicado
  await sql`UPDATE jugadores SET estado='inactivo', puntos_totales=0, updated_at=NOW() WHERE id=${DUP}`;

  await snapshot('DESPUES');
}
run().catch(e => { console.error(e); process.exit(1); });
