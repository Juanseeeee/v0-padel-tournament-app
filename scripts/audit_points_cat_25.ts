
const { config } = require('dotenv');
config({ path: '.env.local' });
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Starting audit for Category 25 (6TA MASCULINO)...");

  // 1. Get Points Configuration
  const puntosConfig = await sql`SELECT * FROM puntos_configuracion ORDER BY orden ASC`;
  const puntosMap: Record<string, number> = {};
  puntosConfig.forEach((pc: any) => {
    puntosMap[pc.instancia] = pc.puntos;
  });
  console.log("Points Configuration:", puntosMap);

  // 2. Get All Tournaments for Category 25
  const torneos = await sql`
    SELECT id, numero_fecha, estado 
    FROM fechas_torneo 
    WHERE categoria_id = 25
    ORDER BY numero_fecha ASC
  `;
  console.log(`Found ${torneos.length} tournaments (All statuses).`);
  torneos.forEach((t: any) => console.log(`  Torneo ${t.id}: ${t.estado}`));

  // 3. Calculate Expected Points per Player (only for finished tournaments)
  const finishedTorneos = torneos.filter((t: any) => t.estado === 'finalizada');
  
  const expectedPoints: Record<number, { 
    total: number, 
    torneos: Set<number>, 
    details: string[] 
  }> = {};

  for (const torneo of finishedTorneos) {
    console.log(`Processing Torneo ${torneo.id} (Fecha ${torneo.numero_fecha})...`);
    
    // Get Bracket Results (Llaves)
    const llaves = await sql`
      SELECT * FROM llaves 
      WHERE fecha_torneo_id = ${torneo.id} AND categoria_id = 25
    `;

    // Calculate instances
    const resultadosParejas = new Map<number, string>(); // parejaId -> instancia

    // Final
    const final = llaves.find((l: any) => l.ronda === "final");
    if (final && final.completado && final.ganador_id) {
        resultadosParejas.set(final.ganador_id, "campeon");
        const sub = final.pareja1_id === final.ganador_id ? final.pareja2_id : final.pareja1_id;
        if (sub) resultadosParejas.set(sub, "finalista");
    }

    // Semis
    const semis = llaves.filter((l: any) => l.ronda === "semifinal" && l.completado);
    for (const s of semis) {
        if (s.ganador_id) {
            const perdedor = s.pareja1_id === s.ganador_id ? s.pareja2_id : s.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "semifinal");
        }
    }

    // 4tos
    const cuartos = llaves.filter((l: any) => l.ronda === "4tos" && l.completado);
    for (const c of cuartos) {
        if (c.ganador_id) {
            const perdedor = c.pareja1_id === c.ganador_id ? c.pareja2_id : c.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "4tos");
        }
    }

    // 8vos
    const octavos = llaves.filter((l: any) => l.ronda === "8vos" && l.completado);
    for (const o of octavos) {
        if (o.ganador_id) {
            const perdedor = o.pareja1_id === o.ganador_id ? o.pareja2_id : o.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "8vos");
        }
    }

    // 16avos
    const dieciseisavos = llaves.filter((l: any) => l.ronda === "16avos" && l.completado);
    for (const d of dieciseisavos) {
        if (d.ganador_id) {
            const perdedor = d.pareja1_id === d.ganador_id ? d.pareja2_id : d.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "16avos");
        }
    }

    // Zona (Parejas not in keys)
    const parejasEnZona = await sql`
        SELECT DISTINCT pt.id
        FROM parejas_torneo pt
        WHERE pt.fecha_torneo_id = ${torneo.id} 
          AND pt.categoria_id = 25
          AND pt.id NOT IN (
            SELECT DISTINCT COALESCE(pareja1_id, 0) FROM llaves WHERE fecha_torneo_id = ${torneo.id} AND categoria_id = 25
            UNION
            SELECT DISTINCT COALESCE(pareja2_id, 0) FROM llaves WHERE fecha_torneo_id = ${torneo.id} AND categoria_id = 25
          )
    `;
    for (const pz of parejasEnZona) {
        if (!resultadosParejas.has(pz.id)) resultadosParejas.set(pz.id, "zona");
    }

    // Assign points to players
    for (const [parejaId, instancia] of resultadosParejas) {
        const puntos = puntosMap[instancia] || 0;
        const pareja = await sql`SELECT jugador1_id, jugador2_id FROM parejas_torneo WHERE id = ${parejaId}`;
        if (pareja.length > 0) {
            const { jugador1_id, jugador2_id } = pareja[0];
            [jugador1_id, jugador2_id].forEach(pid => {
                if (!expectedPoints[pid]) expectedPoints[pid] = { total: 0, torneos: new Set(), details: [] };
                expectedPoints[pid].total += puntos;
                expectedPoints[pid].torneos.add(torneo.id);
                expectedPoints[pid].details.push(`T${torneo.id}: ${instancia} (${puntos})`);
            });
        }
    }
  }

  // 4. Get Actual Points from DB (puntos_categoria)
  const actualPoints = await sql`
    SELECT pc.jugador_id, pc.puntos_acumulados, j.nombre, j.apellido
    FROM puntos_categoria pc
    JOIN jugadores j ON j.id = pc.jugador_id
    WHERE pc.categoria_id = 25
  `;

  console.log("\n--- Discrepancy Report ---");
  let discrepancies = 0;
  for (const actual of actualPoints) {
    const pid = actual.jugador_id;
    const exp = expectedPoints[pid] ? expectedPoints[pid].total : 0;
    const act = actual.puntos_acumulados;

    if (exp !== act) {
        discrepancies++;
        console.log(`Jugador ${actual.nombre} ${actual.apellido} (ID: ${pid})`);
        console.log(`  Expected: ${exp}`);
        console.log(`  Actual:   ${act}`);
        console.log(`  Diff:     ${act - exp}`);
        console.log(`  Details:  ${expectedPoints[pid]?.details.join(', ')}`);
    }
  }

  // Check for players in expected but not in actual
  for (const pid of Object.keys(expectedPoints)) {
      const pidNum = parseInt(pid);
      if (!actualPoints.find((a: any) => a.jugador_id === pidNum)) {
          discrepancies++;
          const exp = expectedPoints[pidNum];
          console.log(`Jugador ID ${pid} MISSING in puntos_categoria`);
          console.log(`  Expected: ${exp.total}`);
          console.log(`  Details:  ${exp.details.join(', ')}`);
      }
  }

  // Deep dive into one player with discrepancy (e.g. 627)
  const debugPlayerId = 627;
  console.log(`\n--- Deep Dive for Player ${debugPlayerId} ---`);
  const historial = await sql`
    SELECT * FROM historial_puntos WHERE jugador_id = ${debugPlayerId}
  `;
  console.log("Historial Puntos:", historial);
  
  const participaciones = await sql`
    SELECT * FROM participaciones WHERE jugador_id = ${debugPlayerId}
  `;
  console.log("Participaciones:", participaciones);

  const jugadorInfo = await sql`SELECT * FROM jugadores WHERE id = ${debugPlayerId}`;
  console.log("Jugador Info:", jugadorInfo);

  if (discrepancies === 0) {
      console.log("No discrepancies found!");
  } else {
      console.log(`\nFound ${discrepancies} discrepancies.`);
  }
}

main();
