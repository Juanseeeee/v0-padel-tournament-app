const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const jug = await sql`
    SELECT id, nombre, apellido, categoria_actual_id, puntos_totales
    FROM jugadores
    WHERE (nombre ILIKE '%marina%' AND apellido ILIKE '%leavy%')
       OR (apellido ILIKE '%marina%' AND nombre ILIKE '%leavy%')
  `;
  console.log('=== JUGADOR(ES) ===');
  console.log(jug);
  if (jug.length === 0) return;

  for (const j of jug) {
    const id = j.id;
    console.log(`\n########## ${j.nombre} ${j.apellido} (id=${id}) ##########`);

    const cats = await sql`SELECT id, nombre FROM categorias ORDER BY id`;
    const catName = (cid) => cats.find(c => c.id === cid)?.nombre ?? cid;

    console.log('\n--- jugador_categorias ---');
    console.log(await sql`SELECT categoria_id FROM jugador_categorias WHERE jugador_id = ${id}`);

    console.log('\n--- puntos_categoria ---');
    const pc = await sql`SELECT * FROM puntos_categoria WHERE jugador_id = ${id} ORDER BY categoria_id`;
    pc.forEach(r => console.log(`  cat=${catName(r.categoria_id)} (${r.categoria_id})  puntos=${r.puntos_acumulados}  torneos=${r.torneos_jugados}  mejor=${r.mejor_resultado}  id=${r.id}`));

    console.log('\n--- ascensos (arrastre) ---');
    const asc = await sql`SELECT * FROM ascensos WHERE jugador_id = ${id} ORDER BY fecha_ascenso`;
    asc.forEach(r => console.log(`  id=${r.id}  ${catName(r.categoria_origen_id)} -> ${catName(r.categoria_destino_id)}  origen=${r.puntos_origen}  transferidos=${r.puntos_transferidos}  fecha=${r.fecha_ascenso}`));

    console.log('\n--- historial_puntos ---');
    const hp = await sql`SELECT id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo, created_at FROM historial_puntos WHERE jugador_id = ${id} ORDER BY categoria_id, created_at`;
    hp.forEach(r => console.log(`  id=${r.id}  cat=${catName(r.categoria_id)}(${r.categoria_id})  fecha_torneo=${r.fecha_torneo_id}  puntos=${r.puntos_acumulados}  motivo="${r.motivo}"`));

    console.log('\n--- participaciones ---');
    const part = await sql`
      SELECT p.id, p.categoria_id, p.fecha_torneo_id, p.puntos_obtenidos, p.instancia_alcanzada, ft.numero_fecha, ft.sede, ft.estado
      FROM participaciones p
      LEFT JOIN fechas_torneo ft ON ft.id = p.fecha_torneo_id
      WHERE p.jugador_id = ${id}
      ORDER BY p.categoria_id, p.fecha_torneo_id`;
    part.forEach(r => console.log(`  cat=${catName(r.categoria_id)}(${r.categoria_id})  torneo=${r.fecha_torneo_id}(fecha ${r.numero_fecha}, ${r.sede}, ${r.estado})  puntos=${r.puntos_obtenidos}  instancia=${r.instancia_alcanzada}`));
  }
}
run().catch(e => { console.error(e); process.exit(1); });
