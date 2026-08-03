const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const jug = await sql`
    SELECT id, nombre, apellido, localidad, categoria_actual_id, puntos_totales, estado
    FROM jugadores
    WHERE nombre ILIKE '%facundo%' AND (apellido ILIKE '%guizoni%' OR apellido ILIKE '%ghizzoni%' OR apellido ILIKE '%ghizoni%' OR apellido ILIKE '%guizzoni%')
    ORDER BY id
  `;
  console.log('=== JUGADORES (posibles duplicados) ===');
  console.log(jug);

  const cats = await sql`SELECT id, nombre FROM categorias ORDER BY id`;
  const catName = (cid) => cats.find(c => c.id === cid)?.nombre ?? cid;

  for (const j of jug) {
    const id = j.id;
    console.log(`\n########## ${j.nombre} ${j.apellido} (id=${id}) estado=${j.estado} localidad=${j.localidad} ##########`);

    console.log('--- usuarios vinculados ---');
    try { console.log(await sql`SELECT id, email, rol FROM usuarios WHERE jugador_id = ${id}`); } catch(e){ console.log('  (usuarios:', e.message, ')'); }

    console.log('--- jugador_categorias ---');
    console.log(await sql`SELECT categoria_id FROM jugador_categorias WHERE jugador_id = ${id}`);

    console.log('--- puntos_categoria ---');
    const pc = await sql`SELECT * FROM puntos_categoria WHERE jugador_id = ${id} ORDER BY categoria_id`;
    pc.forEach(r => console.log(`  cat=${catName(r.categoria_id)}(${r.categoria_id})  puntos=${r.puntos_acumulados}  torneos=${r.torneos_jugados}  mejor=${r.mejor_resultado}  id=${r.id}`));

    console.log('--- participaciones ---');
    const part = await sql`
      SELECT p.id, p.categoria_id, p.fecha_torneo_id, p.puntos_obtenidos, p.instancia_alcanzada, ft.numero_fecha, ft.sede, ft.estado
      FROM participaciones p LEFT JOIN fechas_torneo ft ON ft.id = p.fecha_torneo_id
      WHERE p.jugador_id = ${id} ORDER BY p.categoria_id, p.fecha_torneo_id`;
    part.forEach(r => console.log(`  part_id=${r.id}  cat=${catName(r.categoria_id)}(${r.categoria_id})  torneo=${r.fecha_torneo_id}(F${r.numero_fecha}, ${r.sede}, ${r.estado})  puntos=${r.puntos_obtenidos}  inst=${r.instancia_alcanzada}`));

    console.log('--- historial_puntos ---');
    const hp = await sql`SELECT id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo FROM historial_puntos WHERE jugador_id = ${id} ORDER BY categoria_id, id`;
    hp.forEach(r => console.log(`  id=${r.id}  cat=${catName(r.categoria_id)}(${r.categoria_id})  torneo=${r.fecha_torneo_id}  puntos=${r.puntos_acumulados}  motivo="${r.motivo}"`));

    console.log('--- parejas_torneo (como jugador1 o jugador2) ---');
    const par = await sql`
      SELECT pt.id, pt.fecha_torneo_id, pt.categoria_id, pt.jugador1_id, pt.jugador2_id, ft.numero_fecha, ft.sede
      FROM parejas_torneo pt LEFT JOIN fechas_torneo ft ON ft.id = pt.fecha_torneo_id
      WHERE pt.jugador1_id = ${id} OR pt.jugador2_id = ${id} ORDER BY pt.fecha_torneo_id`;
    par.forEach(r => console.log(`  pareja_id=${r.id}  torneo=${r.fecha_torneo_id}(F${r.numero_fecha}, ${r.sede})  cat=${catName(r.categoria_id)}(${r.categoria_id})  j1=${r.jugador1_id} j2=${r.jugador2_id}`));
  }
}
run().catch(e => { console.error(e); process.exit(1); });
