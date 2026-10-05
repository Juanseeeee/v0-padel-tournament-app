// Agrega la columna de desempate manual del ranking (idempotente).
// Permite al admin forzar el orden entre jugadores empatados en puntos
// (desempate mayor => más arriba). 0 = sin efecto (comportamiento normal).
//   node scripts/setup-desempate.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE puntos_categoria ADD COLUMN IF NOT EXISTS desempate INTEGER NOT NULL DEFAULT 0`;
  console.log('OK. Columna puntos_categoria.desempate lista (default 0).');
}
run().catch((e) => { console.error(e); process.exit(1); });
