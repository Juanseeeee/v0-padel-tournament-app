const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const torneoId = 63; // 1ra fecha 6ta Masc

  // Fetch all completed llaves
  const llaves = await sql`SELECT id, ronda, posicion, pareja1_id, pareja2_id, ganador_id FROM llaves WHERE fecha_torneo_id = ${torneoId} AND estado = 'finalizado' ORDER BY ronda`;
  
  // Also fetch all participants
  const participaciones = await sql`SELECT * FROM participaciones WHERE fecha_torneo_id = ${torneoId}`;

  // Let's see what the semifinalists got
  const semis = llaves.filter(l => l.ronda === 'semis');
  console.log('Semis:', semis);

  const losers = semis.map(s => s.ganador_id === s.pareja1_id ? s.pareja2_id : s.pareja1_id);
  console.log('Parejas perdedoras en semis:', losers);

  // Who are the players in these parejas?
  for (const parejaId of losers) {
    if (!parejaId) continue;
    const pareja = await sql`SELECT * FROM parejas_torneo WHERE id = ${parejaId}`;
    console.log(`Pareja ${parejaId}:`, pareja[0]);
    const p1 = participaciones.find(p => p.jugador_id === pareja[0].jugador1_id);
    const p2 = participaciones.find(p => p.jugador_id === pareja[0].jugador2_id);
    console.log('  Participacion j1:', p1?.instancia_alcanzada, p1?.puntos_obtenidos);
    console.log('  Participacion j2:', p2?.instancia_alcanzada, p2?.puntos_obtenidos);
  }
}
run().catch(console.error);