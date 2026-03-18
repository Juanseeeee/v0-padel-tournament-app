const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'check_all_6ta_v2.log');
fs.writeFileSync(logFile, 'Check All Script V2 started\n');

function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg);
}

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_nrG8ZMy1qTSA@ep-steep-sound-ah2s3ppq.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  log('Run function started...');
  await client.connect();
  
  try {
    const categoriaId = 25;
    const fechaTorneoId = 63;

    log("--- CHECKING ALL PARTICIPATIONS vs HISTORIAL ---");
    
    // Get all participations for this tournament/category
    const parts = await client.query(`
      SELECT p.jugador_id, p.puntos_obtenidos as part_puntos, p.instancia_alcanzada as part_instancia,
             j.nombre, j.apellido
      FROM participaciones p
      JOIN jugadores j ON p.jugador_id = j.id
      WHERE p.fecha_torneo_id = $1 AND p.categoria_id = $2
    `, [fechaTorneoId, categoriaId]);
    log(`Found ${parts.rows.length} participations`);

    // Get all history for this tournament/category
    const history = await client.query(`
      SELECT h.jugador_id, h.puntos_acumulados as hist_puntos, h.motivo
      FROM historial_puntos h
      WHERE h.fecha_torneo_id = $1 AND h.categoria_id = $2
    `, [fechaTorneoId, categoriaId]);
    log(`Found ${history.rows.length} history entries`);

    const historyMap = new Map();
    history.rows.forEach(h => historyMap.set(h.jugador_id, h));

    let discrepancies = 0;

    parts.rows.forEach(p => {
      const h = historyMap.get(p.jugador_id);
      if (!h) {
        log(`WARNING: Player ${p.nombre} ${p.apellido} (ID ${p.jugador_id}) has participation but NO history entry.`);
      } else {
        if (p.part_puntos !== h.hist_puntos) {
          log(`DISCREPANCY: Player ${p.nombre} ${p.apellido} (ID ${p.jugador_id})`);
          log(`  Participacion: ${p.part_puntos} pts (${p.part_instancia})`);
          log(`  Historial:     ${h.hist_puntos} pts (${h.motivo})`);
          discrepancies++;
        }
      }
    });

    if (discrepancies === 0) {
      log("No discrepancies found.");
    } else {
      log(`Found ${discrepancies} discrepancies.`);
    }

  } catch (e) {
    log('Error: ' + e.message);
  } finally {
    await client.end();
  }
  log('Script finished');
}

run();
