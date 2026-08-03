const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const JUG = 508;      // MARINA LEAVY
const CAT_7MA = 30;
const CAT_6TA = 32;

async function run() {
  console.log('ANTES:');
  console.log('  jugador_categorias:', await sql`SELECT categoria_id FROM jugador_categorias WHERE jugador_id = ${JUG} ORDER BY categoria_id`);
  console.log('  categoria_actual:', (await sql`SELECT categoria_actual_id FROM jugadores WHERE id = ${JUG}`)[0]);

  // Quitar del roster activo de 7MA (queda ascendida a 6TA, como cualquier ascenso normal)
  await sql`DELETE FROM jugador_categorias WHERE jugador_id = ${JUG} AND categoria_id = ${CAT_7MA}`;

  // Asegurar que exista la pertenencia a 6TA (ya deberia existir)
  const en6ta = await sql`SELECT 1 FROM jugador_categorias WHERE jugador_id = ${JUG} AND categoria_id = ${CAT_6TA}`;
  if (en6ta.length === 0) {
    await sql`INSERT INTO jugador_categorias (jugador_id, categoria_id) VALUES (${JUG}, ${CAT_6TA})`;
  }

  // categoria_actual = 6TA
  await sql`UPDATE jugadores SET categoria_actual_id = ${CAT_6TA}, updated_at = NOW() WHERE id = ${JUG}`;

  console.log('\nDESPUES:');
  console.log('  jugador_categorias:', await sql`SELECT categoria_id FROM jugador_categorias WHERE jugador_id = ${JUG} ORDER BY categoria_id`);
  console.log('  categoria_actual:', (await sql`SELECT categoria_actual_id FROM jugadores WHERE id = ${JUG}`)[0]);
}
run().catch(e => { console.error(e); process.exit(1); });
