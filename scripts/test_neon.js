const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const logFile = 'scripts/debug.log';
// Overwrite log file to start fresh
fs.writeFileSync(logFile, 'Script started (test_neon.js modified)\n');

function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg);
}

const sql = neon('postgresql://neondb_owner:npg_nrG8ZMy1qTSA@ep-steep-sound-ah2s3ppq.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
  log('Run function started...');
  try {
    log("--- JUGADORES ---");
    const res1 = await sql`
      SELECT id, nombre, apellido, categoria_actual_id
      FROM jugadores
      WHERE apellido ILIKE '%ULLUA%'
         OR apellido ILIKE '%GHERPELLI%'
         OR apellido ILIKE '%LEON%'
         OR apellido ILIKE '%DUCASSE%'
    `;
    log(JSON.stringify(res1, null, 2));

    if (res1.length > 0) {
      const ids = res1.map(j => j.id);
      
      log("\n--- PUNTOS CATEGORIA (TOTALES) ---");
      const res2 = await sql`
        SELECT * 
        FROM puntos_categoria 
        WHERE jugador_id = ANY(${ids})
      `;
      log(JSON.stringify(res2, null, 2));

      log("\n--- PARTICIPACIONES ---");
      const res3 = await sql`
        SELECT * FROM participaciones WHERE jugador_id = ANY(${ids})
      `;
      log(JSON.stringify(res3, null, 2));

      log("\n--- HISTORIAL PUNTOS ---");
      const res4 = await sql`
        SELECT * FROM historial_puntos WHERE jugador_id = ANY(${ids})
      `;
      log(JSON.stringify(res4, null, 2));

      log("\n--- ASCENSOS ---");
      const res5 = await sql`
        SELECT * FROM ascensos WHERE jugador_id = ANY(${ids})
      `;
      log(JSON.stringify(res5, null, 2));
    } else {
        log("No players found matching criteria.");
    }
  } catch (e) {
    log('Error: ' + e.message);
    log('Stack: ' + e.stack);
  }
  log('Script finished');
}

run();
