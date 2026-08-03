const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const cats = await sql`SELECT id, nombre FROM categorias ORDER BY id`;
  const catName = (cid) => cats.find(c => c.id === cid)?.nombre ?? cid;

  console.log('=== JUGADORES ===');
  const jugs = await sql`
    SELECT id, nombre, apellido, categoria_actual_id, estado
    FROM jugadores
    WHERE (nombre ILIKE '%alexis%' AND apellido ILIKE '%vitale%')
       OR (nombre ILIKE '%jonatan%' AND apellido ILIKE '%ubilla%')
       OR (nombre ILIKE '%jonathan%' AND apellido ILIKE '%ubilla%')
    ORDER BY apellido`;
  for (const j of jugs) {
    const jcs = await sql`SELECT categoria_id FROM jugador_categorias WHERE jugador_id = ${j.id}`;
    const us = await sql`SELECT id, email FROM usuarios WHERE jugador_id = ${j.id}`;
    console.log(`\n  ${j.nombre} ${j.apellido} (id=${j.id}) estado=${j.estado} cat_actual=${catName(j.categoria_actual_id)}(${j.categoria_actual_id})`);
    console.log(`    jugador_categorias: ${jcs.map(c => catName(c.categoria_id)+'('+c.categoria_id+')').join(', ') || '(ninguna)'}`);
    console.log(`    usuarios: ${us.map(u => u.email+'#'+u.id).join(', ') || '(sin login)'}`);
  }

  console.log('\n=== TORNEOS "12 DE OCTUBRE PADEL" ===');
  const torneos = await sql`
    SELECT id, numero_fecha, categoria_id, sede, estado
    FROM fechas_torneo
    WHERE sede ILIKE '%12 de octubre%'
    ORDER BY numero_fecha, categoria_id`;
  torneos.forEach(t => console.log(`  torneo_id=${t.id}  F${t.numero_fecha}  cat=${catName(t.categoria_id)}(${t.categoria_id})  sede="${t.sede}"  estado=${t.estado}`));

  // Foco: Fecha 6
  console.log('\n=== FECHA 6 (todas las sedes/categorias) ===');
  const f6 = await sql`SELECT id, numero_fecha, categoria_id, sede, estado FROM fechas_torneo WHERE numero_fecha = 6 ORDER BY categoria_id`;
  f6.forEach(t => console.log(`  torneo_id=${t.id}  F${t.numero_fecha}  cat=${catName(t.categoria_id)}(${t.categoria_id})  sede="${t.sede}"  estado=${t.estado}`));

  // Para cada jugador, ver en que parejas/torneos F6 ya esta inscripto
  console.log('\n=== INSCRIPCIONES EXISTENTES de estos jugadores ===');
  for (const j of jugs) {
    const par = await sql`
      SELECT pt.id, pt.fecha_torneo_id, pt.categoria_id, pt.jugador1_id, pt.jugador2_id, ft.numero_fecha, ft.sede, ft.estado
      FROM parejas_torneo pt JOIN fechas_torneo ft ON ft.id = pt.fecha_torneo_id
      WHERE pt.jugador1_id = ${j.id} OR pt.jugador2_id = ${j.id}
      ORDER BY ft.numero_fecha`;
    console.log(`  ${j.nombre} ${j.apellido} (id=${j.id}):`);
    par.forEach(p => console.log(`    torneo=${p.fecha_torneo_id}(F${p.numero_fecha}, ${p.sede}, ${p.estado}) cat=${catName(p.categoria_id)}(${p.categoria_id}) j1=${p.jugador1_id} j2=${p.jugador2_id}`));
    if (par.length === 0) console.log('    (sin inscripciones)');
  }
}
run().catch(e => { console.error(e); process.exit(1); });
