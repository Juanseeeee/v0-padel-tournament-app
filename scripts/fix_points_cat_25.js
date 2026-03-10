const { neon } = require("@neondatabase/serverless");
const { config } = require('dotenv');
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

const CATEGORY_ID = 25;
const TORNEO_ID = 63;
const DRY_RUN = false; // Set to false to execute

async function main() {
    console.log(`Starting Fix for Category ${CATEGORY_ID}, Torneo ${TORNEO_ID}...`);
    console.log(`DRY RUN: ${DRY_RUN}`);

    // 1. Get Points Configuration
    const puntosConfig = await sql`SELECT * FROM puntos_configuracion ORDER BY orden ASC`;
    const puntosMap = {};
    puntosConfig.forEach((pc) => {
        puntosMap[pc.instancia] = pc.puntos;
    });
    console.log("Points Config:", puntosMap);

    // 2. Get Tournament Brackets (Llaves)
    const llaves = await sql`
      SELECT * FROM llaves 
      WHERE fecha_torneo_id = ${TORNEO_ID} AND categoria_id = ${CATEGORY_ID}
    `;
    console.log(`Found ${llaves.length} llaves.`);

    // 3. Get All Couples (Parejas)
    const parejas = await sql`
      SELECT * FROM parejas_torneo 
      WHERE fecha_torneo_id = ${TORNEO_ID} AND categoria_id = ${CATEGORY_ID}
    `;
    console.log(`Found ${parejas.length} couples.`);

    // 4. Calculate Results
    const resultadosParejas = new Map(); // parejaId -> instancia

    // Final
    const final = llaves.find((l) => l.ronda === "final");
    if (final && final.estado === "finalizado" && final.ganador_id) {
        resultadosParejas.set(final.ganador_id, "campeon");
        const sub = final.pareja1_id === final.ganador_id ? final.pareja2_id : final.pareja1_id;
        if (sub) resultadosParejas.set(sub, "finalista");
    }

    // Semis
    const semis = llaves.filter((l) => l.ronda === "semifinal" && l.estado === "finalizado");
    for (const s of semis) {
        if (s.ganador_id) {
            const perdedor = s.pareja1_id === s.ganador_id ? s.pareja2_id : s.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "semifinalista");
        }
    }

    // 4tos
    const cuartos = llaves.filter((l) => l.ronda === "4tos" && l.estado === "finalizado");
    for (const c of cuartos) {
        if (c.ganador_id) {
            const perdedor = c.pareja1_id === c.ganador_id ? c.pareja2_id : c.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "cuartofinalista");
        }
    }

    // 8vos
    const octavos = llaves.filter((l) => l.ronda === "8vos" && l.estado === "finalizado");
    for (const o of octavos) {
        if (o.ganador_id) {
            const perdedor = o.pareja1_id === o.ganador_id ? o.pareja2_id : o.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "octavofinalista");
        }
    }
    
    // 16avos
    const dieciseis = llaves.filter((l) => l.ronda === "16avos" && l.estado === "finalizado");
    for (const d of dieciseis) {
        if (d.ganador_id) {
            const perdedor = d.pareja1_id === d.ganador_id ? d.pareja2_id : d.pareja1_id;
            if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "16avos");
        }
    }

    // Zona (Add all couples not in playoffs results yet)
    // Wait, if they are in playoffs they might have lost in first round (e.g. 8vos) and got "octavofinalista".
    // If they didn't make it to playoffs, they are "zona".
    // How do we know who made it to playoffs?
    // Any couple in `llaves` is in playoffs.
    // BUT, `llaves` contains matches.
    // A couple might be in `llaves` (played 8vos) and lost -> octavofinalista.
    // A couple NOT in `llaves` -> zona.
    
    // Let's iterate all couples
    for (const p of parejas) {
        if (!resultadosParejas.has(p.id)) {
             // Assuming everyone who registered played at least group phase
             resultadosParejas.set(p.id, "zona");
        }
    }

    console.log("Calculated Results for Couples:", resultadosParejas);

    // 5. Calculate Points per Player
    const playerPoints = new Map(); // playerId -> { points, instancia }

    for (const [parejaId, instancia] of resultadosParejas) {
        const puntos = puntosMap[instancia] || 0;
        const pareja = parejas.find(p => p.id === parejaId);
        if (pareja) {
            [pareja.jugador1_id, pareja.jugador2_id].forEach(pid => {
                playerPoints.set(pid, { points: puntos, instancia: instancia });
            });
        }
    }

    // 6. Identify Players to Update
    // Get all players currently with points in this tournament (to handle removals)
    const currentParticipations = await sql`
        SELECT jugador_id FROM participaciones 
        WHERE fecha_torneo_id = ${TORNEO_ID} AND categoria_id = ${CATEGORY_ID}
    `;
    const playersToReset = new Set(currentParticipations.map(row => row.jugador_id));

    // Also include players who have points in puntos_categoria but maybe no participation record (ghost points)
    const currentPuntosCat = await sql`
        SELECT jugador_id FROM puntos_categoria 
        WHERE categoria_id = ${CATEGORY_ID} AND puntos_acumulados > 0
    `;
    currentPuntosCat.forEach(row => playersToReset.add(row.jugador_id));
    
    // Add players from our calculation
    for (const pid of playerPoints.keys()) {
        playersToReset.add(pid);
    }
    
    console.log(`Total unique players involved: ${playersToReset.size}`);

    if (!DRY_RUN) {
        console.log("EXECUTING FIX...");
        
        // Transaction? Neon serverless doesn't support multi-statement transactions in one `sql` call easily without helper.
        // We will do sequential operations.
        
        // A. Delete existing records for this tournament
        console.log("Deleting existing participaciones and historial_puntos...");
        await sql`DELETE FROM participaciones WHERE fecha_torneo_id = ${TORNEO_ID} AND categoria_id = ${CATEGORY_ID}`;
        await sql`DELETE FROM historial_puntos WHERE fecha_torneo_id = ${TORNEO_ID} AND categoria_id = ${CATEGORY_ID}`;
        
        // B. Insert new records
        console.log("Inserting new records...");
        for (const [playerId, data] of playerPoints) {
            // Participacion
            await sql`
                INSERT INTO participaciones (jugador_id, fecha_torneo_id, categoria_id, instancia_alcanzada, puntos_obtenidos, created_at)
                VALUES (${playerId}, ${TORNEO_ID}, ${CATEGORY_ID}, ${data.instancia}, ${data.points}, NOW())
            `;
            
            // Historial
            await sql`
                INSERT INTO historial_puntos (jugador_id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo, created_at)
                VALUES (${playerId}, ${CATEGORY_ID}, ${TORNEO_ID}, ${data.points}, ${`Fecha 1 - ${data.instancia}`}, NOW())
            `;
        }
        
        // C. Update Puntos Categoria and Jugadores
        console.log("Updating puntos_categoria and jugadores...");
        for (const pid of playersToReset) {
            // Calculate total points for this player in this category
            // Since we deleted and re-inserted, we can query historial_puntos
            const totalPointsRes = await sql`
                SELECT SUM(puntos_acumulados) as total 
                FROM historial_puntos 
                WHERE jugador_id = ${pid} AND categoria_id = ${CATEGORY_ID}
            `;
            const totalPoints = parseInt(totalPointsRes[0].total || 0);
            
            // Determine best result
            // Since only 1 tournament, it's the current one. 
            // If multiple, we need to find max rank. 
            // For now, simpler: query participaciones
            // But we only have 1 tournament.
            const bestRes = playerPoints.get(pid)?.instancia || 'zona'; // Default if 0 points?
            
            // Check if row exists in puntos_categoria
            const existingCat = await sql`SELECT id FROM puntos_categoria WHERE jugador_id = ${pid} AND categoria_id = ${CATEGORY_ID}`;
            
            if (existingCat.length > 0) {
                await sql`
                    UPDATE puntos_categoria 
                    SET puntos_acumulados = ${totalPoints}, 
                        mejor_resultado = ${bestRes},
                        torneos_jugados = 1,
                        updated_at = NOW()
                    WHERE id = ${existingCat[0].id}
                `;
            } else {
                if (totalPoints > 0) {
                    await sql`
                        INSERT INTO puntos_categoria (jugador_id, categoria_id, puntos_acumulados, torneos_jugados, mejor_resultado, partidos_jugados, updated_at)
                        VALUES (${pid}, ${CATEGORY_ID}, ${totalPoints}, 1, ${bestRes}, 0, NOW())
                    `;
                }
            }
            
            // Update Global Puntos (Jugadores table)
            // Assuming 6ta caballeros is their main category or we sum all categories?
            // "puntos_totales" usually sums all categories.
            // We should recalculate sum of all puntos_categoria for this player?
            const allCats = await sql`SELECT SUM(puntos_acumulados) as total FROM puntos_categoria WHERE jugador_id = ${pid}`;
            const globalTotal = parseInt(allCats[0].total || 0);
            
            await sql`UPDATE jugadores SET puntos_totales = ${globalTotal} WHERE id = ${pid}`;
        }
        
        console.log("Fix completed successfully.");
    } else {
        console.log("DRY RUN COMPLETED. No changes made.");
        console.log("Would delete participaciones and historial for Torneo 63, Cat 25.");
        console.log(`Would insert ${playerPoints.size} player records.`);
        // Log details for Player 627 and 624
        console.log("Player 627 (Juan Martin Samana):", playerPoints.get(627));
        console.log("Player 624 (Lautaro De Leon):", playerPoints.get(624));
    }
}

main();
