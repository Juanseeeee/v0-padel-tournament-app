const { neon } = require('@neondatabase/serverless');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
const envPath = path.resolve(process.cwd(), ".env.local");
if (require("fs").existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log("Connecting to DB...");
    // 1. Get a valid zona_id
    console.log("Fetching a valid zona_id...");
    const zonas = await sql`SELECT id FROM zonas LIMIT 1`;
    console.log("Zonas result:", zonas);
    
    if (zonas.length === 0) {
      console.log("No zonas found. Cannot test.");
      return;
    }
    const zonaId = zonas[0].id;
    console.log(`Using zonaId: ${zonaId}`);

    // Get valid pareja IDs
    const parejas = await sql`SELECT id FROM parejas_torneo LIMIT 2`;
    console.log("Parejas result:", parejas);
    
    let p1 = 1, p2 = 2;
    if (parejas.length >= 2) {
        p1 = parejas[0].id;
        p2 = parejas[1].id;
    }
    
    // 2. Try simple INSERT into partidos_zona
    console.log(`Attempting INSERT into partidos_zona with zonaId=${zonaId}, p1=${p1}, p2=${p2}...`);
    try {
        await sql`
          INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, tipo_partido, estado)
          VALUES (${zonaId}, ${p1}, ${p2}, 'round_robin', 'pendiente')
        `;
        console.log("INSERT success!");
    } catch (e) {
        console.error("INSERT failed:", e);
    }

  } catch (error) {
    console.error("Script error:", error);
  }
}

run();
