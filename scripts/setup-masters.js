// Crea las tablas del feature "Master" (idempotente). Ejecutar una vez:
//   node scripts/setup-masters.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('Creando tablas de Masters (si no existen)...');

  await sql`
    CREATE TABLE IF NOT EXISTS masters (
      id SERIAL PRIMARY KEY,
      categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
      temporada INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'borrador',
      fecha_evento DATE,
      dias_juego TEXT,
      hora_inicio TEXT,
      publicado BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (categoria_id, temporada)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS master_participantes (
      id SERIAL PRIMARY KEY,
      master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      seed INTEGER NOT NULL,
      puntos INTEGER NOT NULL DEFAULT 0,
      pareja_numero INTEGER,
      es_reemplazo BOOLEAN NOT NULL DEFAULT false,
      reemplaza_a_jugador_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (master_id, jugador_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS master_llaves (
      id SERIAL PRIMARY KEY,
      master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
      ronda TEXT NOT NULL,
      posicion INTEGER NOT NULL,
      equipo1_numero INTEGER,
      equipo2_numero INTEGER,
      set1_e1 INTEGER, set1_e2 INTEGER,
      set2_e1 INTEGER, set2_e2 INTEGER,
      set3_e1 INTEGER, set3_e2 INTEGER,
      ganador_numero INTEGER,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      siguiente_llave_id INTEGER REFERENCES master_llaves(id) ON DELETE SET NULL,
      siguiente_llave_slot INTEGER,
      fecha_hora_programada TEXT,
      cancha_numero INTEGER,
      orden INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_master_participantes_master ON master_participantes(master_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_master_llaves_master ON master_llaves(master_id)`;

  console.log('OK. Tablas: masters, master_participantes, master_llaves.');
}

run().catch((e) => { console.error(e); process.exit(1); });
