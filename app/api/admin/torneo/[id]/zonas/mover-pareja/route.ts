import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: torneoId } = await params;
    const { pareja_torneo_id, zona_origen_id, zona_destino_id, pareja_intercambio_id, accion } = await request.json();
    const PID = parseInt(String(pareja_torneo_id));
    const ZID_ORIG = parseInt(String(zona_origen_id));
    const ZID_DEST = parseInt(String(zona_destino_id));
    const SWAP_ID = pareja_intercambio_id != null ? parseInt(String(pareja_intercambio_id)) : null;

    if (!PID || !ZID_ORIG || !ZID_DEST) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Handle reordering within the same zone
    if (ZID_ORIG === ZID_DEST) {
      if ((accion === 'reordenar' || accion === 'intercambiar') && SWAP_ID) {
        const partidosJugados = await sql`
          SELECT COUNT(*) as count FROM partidos_zona
          WHERE zona_id = ${ZID_ORIG}
            AND (pareja1_id = ${PID} OR pareja2_id = ${PID} OR pareja1_id = ${SWAP_ID} OR pareja2_id = ${SWAP_ID})
            AND estado = 'finalizado'
        `;
        if (parseInt(partidosJugados[0].count) > 0) {
          return NextResponse.json({ error: "No se puede reordenar parejas que ya jugaron partidos" }, { status: 400 });
        }

        await normalizeZonePositions(ZID_ORIG);

        const rows = await sql`
          SELECT id, posicion_final, pareja_id
          FROM parejas_zona
          WHERE zona_id = ${ZID_ORIG}
          ORDER BY posicion_final ASC, id ASC
        `;
        const sourceIndex = rows.findIndex((r: any) => r.pareja_id === PID);
        const targetIndex = rows.findIndex((r: any) => r.pareja_id === SWAP_ID);
        if (sourceIndex === -1 || targetIndex === -1) {
          return NextResponse.json({ error: "Parejas a reordenar no encontradas en la zona" }, { status: 404 });
        }

        const reorderedRows = [...rows];
        if (accion === 'reordenar') {
          const [movedRow] = reorderedRows.splice(sourceIndex, 1);
          reorderedRows.splice(targetIndex, 0, movedRow);
        } else {
          [reorderedRows[sourceIndex], reorderedRows[targetIndex]] = [reorderedRows[targetIndex], reorderedRows[sourceIndex]];
        }

        try {
          await writeZonePositions(
            ZID_ORIG,
            reorderedRows.map((row: any) => row.id)
          );
        } catch (e: any) {
          console.error("Swap parejas_zona failed:", e);
          return NextResponse.json({ error: "Error reordenando parejas: " + e.message }, { status: 500 });
        }

        try {
          await regenerateZoneMatches(ZID_ORIG, parseInt(torneoId));
          await scheduleZoneMatches(ZID_ORIG, parseInt(torneoId));
          await logAudit(parseInt(torneoId), 'reordenar_zona', `Reordenar parejas ${PID} y ${SWAP_ID} en Zona ${ZID_ORIG}`);
        } catch (e) {
          console.error("Regenerate after swap failed:", e);
        }

        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "La zona de origen y destino son iguales" }, { status: 400 });
    }

    // Verify both zones belong to this tournament and aren't finalized
    const zonas = await sql`
      SELECT id, nombre, estado FROM zonas 
      WHERE id IN (${ZID_ORIG}, ${ZID_DEST}) 
        AND fecha_torneo_id = ${parseInt(torneoId)}
    `;

    if (zonas.length !== 2) {
      return NextResponse.json({ error: "Zonas no encontradas" }, { status: 404 });
    }

    const finalizada = zonas.find(z => z.estado === 'finalizada');
    if (finalizada) {
      return NextResponse.json({ error: `La zona ${finalizada.nombre} ya está cerrada` }, { status: 400 });
    }

    // Check no played games in origin zone for this pareja
    const partidosJugados = await sql`
      SELECT COUNT(*) as count FROM partidos_zona
      WHERE zona_id = ${ZID_ORIG}
        AND (pareja1_id = ${PID} OR pareja2_id = ${PID})
        AND estado = 'finalizado'
    `;

    if (parseInt(partidosJugados[0].count) > 0) {
      return NextResponse.json({ error: "No se puede mover una pareja que ya jugó partidos en su zona" }, { status: 400 });
    }

    // If swapping or explicitly requested to swap
    if (SWAP_ID || accion === 'intercambiar') {
      // If no explicit target pair provided but action is swap, try to find one (e.g. last one)
      let targetId = SWAP_ID;
      if (!targetId && accion === 'intercambiar') {
         const lastPair = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${ZID_DEST} ORDER BY id DESC LIMIT 1`;
         if (lastPair.length > 0) targetId = lastPair[0].pareja_id;
      }

      if (targetId) {
        await normalizeZonePositions(ZID_ORIG);
        await normalizeZonePositions(ZID_DEST);

        const sourceRow = await sql`
          SELECT id, posicion_final FROM parejas_zona
          WHERE zona_id = ${ZID_ORIG} AND pareja_id = ${PID}
          LIMIT 1
        `;

        // Verify target pair belongs to destination zone
        const targetPairCheck = await sql`
            SELECT id, posicion_final FROM parejas_zona
            WHERE zona_id = ${ZID_DEST} AND pareja_id = ${targetId}
        `;
        
        if (targetPairCheck.length === 0) {
            return NextResponse.json({ error: "La pareja de intercambio no pertenece a la zona de destino" }, { status: 400 });
        }
        if (sourceRow.length === 0) {
            return NextResponse.json({ error: "La pareja a mover no pertenece a la zona de origen" }, { status: 400 });
        }

        // Check no played games in destination zone for target pair
        const partidosJugadosTarget = await sql`
            SELECT COUNT(*) as count FROM partidos_zona
            WHERE zona_id = ${ZID_DEST}
            AND (pareja1_id = ${targetId} OR pareja2_id = ${targetId})
            AND estado = 'finalizado'
        `;

        if (parseInt(partidosJugadosTarget[0].count) > 0) {
            return NextResponse.json({ error: "No se puede intercambiar con una pareja que ya jugó partidos" }, { status: 400 });
        }

        // Perform SWAP in tables
        
        // 1. Swap in parejas_zona (Delete and Insert to handle constraints cleanly)
        await sql`DELETE FROM parejas_zona WHERE pareja_id = ${PID} AND zona_id = ${ZID_ORIG}`;
        await sql`DELETE FROM parejas_zona WHERE pareja_id = ${targetId} AND zona_id = ${ZID_DEST}`;
        await sql`INSERT INTO parejas_zona (zona_id, pareja_id, posicion_final) VALUES (${ZID_DEST}, ${PID}, ${targetPairCheck[0].posicion_final})`;
        await sql`INSERT INTO parejas_zona (zona_id, pareja_id, posicion_final) VALUES (${ZID_ORIG}, ${targetId}, ${sourceRow[0].posicion_final})`;
        await normalizeZonePositions(ZID_ORIG);
        await normalizeZonePositions(ZID_DEST);

        // 2. Swap in partidos_zona (Update IDs directly to preserve matches)
        // DEPRECATED: We will regenerate matches instead to ensure consistency
        /*
        // Zone A: P1 -> P2 (Target)
          await sql`
            UPDATE partidos_zona
            SET pareja1_id = CASE WHEN pareja1_id = ${PID} THEN ${targetId} ELSE pareja1_id END,
                pareja2_id = CASE WHEN pareja2_id = ${PID} THEN ${targetId} ELSE pareja2_id END
            WHERE zona_id = ${ZID_ORIG} AND estado = 'pendiente'
        `;

        // Zone B: P2 (Target) -> P1
          await sql`
            UPDATE partidos_zona
            SET pareja1_id = CASE WHEN pareja1_id = ${targetId} THEN ${PID} ELSE pareja1_id END,
                pareja2_id = CASE WHEN pareja2_id = ${targetId} THEN ${PID} ELSE pareja2_id END
            WHERE zona_id = ${ZID_DEST} AND estado = 'pendiente'
        `;
        */
       
        // Regenerate matches for both zones to ensure correct ordering/structure
        await regenerateZoneMatches(ZID_ORIG, parseInt(torneoId));
        await regenerateZoneMatches(ZID_DEST, parseInt(torneoId));
        await scheduleZoneMatches(ZID_ORIG, parseInt(torneoId));
        await scheduleZoneMatches(ZID_DEST, parseInt(torneoId));

        await logAudit(parseInt(torneoId), 'intercambio_zonas', `Intercambio pareja ${PID} (Zona ${ZID_ORIG}) con ${targetId} (Zona ${ZID_DEST})`);

        return NextResponse.json({ success: true });
      }
    }

    // Capacity check for destination zone
    const destCountRes = await sql`
      SELECT COUNT(*) as count FROM parejas_zona WHERE zona_id = ${ZID_DEST}
    `;
    const destCount = parseInt(destCountRes[0].count);
    const maxZona = 4;
    if (destCount >= maxZona) {
      return NextResponse.json({ error: "La zona destino está completa" }, { status: 400 });
    }

    // Standard Move
    // Note: Removed BEGIN/COMMIT because Neon serverless HTTP driver doesn't support interactive transactions
    try {
        await normalizeZonePositions(ZID_ORIG);
        await normalizeZonePositions(ZID_DEST);

        // Remove pareja from origin zone
        await sql`
        DELETE FROM parejas_zona WHERE pareja_id = ${PID} AND zona_id = ${ZID_ORIG}
        `;

        // Delete pending matches involving this pareja in origin zone
        // (Regenerate will handle this, but explicit cleanup is safer)
        await sql`
        DELETE FROM partidos_zona 
        WHERE zona_id = ${ZID_ORIG}
            AND (pareja1_id = ${PID} OR pareja2_id = ${PID})
            AND estado = 'pendiente'
        `;

        // Add pareja to destination zone
        const nextDestPosition = await getNextZonePosition(ZID_DEST);
        await sql`
        INSERT INTO parejas_zona (zona_id, pareja_id, posicion_final)
        VALUES (${ZID_DEST}, ${PID}, ${nextDestPosition})
        ON CONFLICT DO NOTHING
        `;

        await normalizeZonePositions(ZID_ORIG);
        await normalizeZonePositions(ZID_DEST);

        // Regenerate round-robin matches for both zones
        await regenerateZoneMatches(ZID_ORIG, parseInt(torneoId));
        await regenerateZoneMatches(ZID_DEST, parseInt(torneoId));
        
        // Recalcular horarios para ambas zonas (pendientes)
        await scheduleZoneMatches(ZID_ORIG, parseInt(torneoId));
        await scheduleZoneMatches(ZID_DEST, parseInt(torneoId));

        await logAudit(parseInt(torneoId), 'mover_zona', `Mover pareja ${PID} de Zona ${ZID_ORIG} a Zona ${ZID_DEST}`);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        // await sql`ROLLBACK`; // Cannot rollback in stateless connection
        throw e;
    }
  } catch (error: any) {
    console.error("Error moviendo pareja:", error);
    return NextResponse.json({ error: "Error moviendo pareja: " + error.message }, { status: 500 });
  }
}

async function logAudit(torneoId: number, accion: string, detalle: string) {
    try {
        // Simple console log for now, but structured for future DB insertion
        console.log(`[AUDIT] Torneo: ${torneoId} | Acción: ${accion} | Detalle: ${detalle} | Timestamp: ${new Date().toISOString()}`);
        // If an audit table existed, we would insert here:
        // await sql`INSERT INTO auditoria (torneo_id, accion, detalle, created_at) VALUES (${torneoId}, ${accion}, ${detalle}, NOW())`;
    } catch (e) {
        console.error("Audit log failed", e);
    }
}

async function normalizeZonePositions(zonaId: number) {
  const rows = await sql`
    SELECT id
    FROM parejas_zona
    WHERE zona_id = ${zonaId}
    ORDER BY COALESCE(posicion_final, 2147483647), id ASC
  `;

  await writeZonePositions(
    zonaId,
    rows.map((row: any) => row.id)
  );
}

async function writeZonePositions(zonaId: number, orderedRowIds: number[]) {
  await sql`
    UPDATE parejas_zona
    SET posicion_final = NULL
    WHERE zona_id = ${zonaId}
  `;

  for (let index = 0; index < orderedRowIds.length; index++) {
    await sql`
      UPDATE parejas_zona
      SET posicion_final = ${index + 1}
      WHERE id = ${orderedRowIds[index]}
    `;
  }
}

async function getNextZonePosition(zonaId: number) {
  const rows = await sql`
    SELECT COALESCE(MAX(posicion_final), 0) + 1 AS next_position
    FROM parejas_zona
    WHERE zona_id = ${zonaId}
  `;

  return parseInt(String(rows[0]?.next_position || 1), 10);
}

async function regenerateZoneMatches(zonaId: number, torneoId: number) {
  // Get current parejas in this zone, ordered by posicion_final (visual order) to ensure matches match the table
  const parejasZona = await sql`
    SELECT pareja_id FROM parejas_zona 
    WHERE zona_id = ${zonaId}
    ORDER BY posicion_final ASC, id ASC
  `;

  if (parejasZona.length < 2) return;

  // Check for existing finalized matches
  const finalizedMatches = await sql`
    SELECT pareja1_id, pareja2_id FROM partidos_zona 
    WHERE zona_id = ${zonaId} AND estado = 'finalizado'
  `;
  const playedPairs = new Set<string>();
  finalizedMatches.forEach((m: any) => {
    playedPairs.add(`${Math.min(m.pareja1_id, m.pareja2_id)}-${Math.max(m.pareja1_id, m.pareja2_id)}`);
  });

  // Delete only pending (unplayed) matches
  await sql`
    DELETE FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'pendiente'
  `;

  const ids = parejasZona.map(p => p.pareja_id);
  
  if (ids.length === 3 && playedPairs.size === 0) {
    // Zona de 3: inicial, perdedor_vs_3, ganador_vs_3
    // We only insert if matches don't conflict with played ones, but for 3-zone template, 
    // structure is fixed. If played matches exist, we might have partial state.
    // If no matches played, we regenerate all.
    await sql`
    INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, tipo_partido, estado, orden_partido)
    VALUES
        (${zonaId}, ${ids[0]}, ${ids[1]}, 'inicial', 'pendiente', 1),
        (${zonaId}, NULL, ${ids[2]}, 'perdedor_vs_3', 'pendiente', 2),
        (${zonaId}, NULL, ${ids[2]}, 'ganador_vs_3', 'pendiente', 3)
    `;
  } else if (ids.length === 4 && playedPairs.size === 0) {
    // Zona de 4: semifinales, 3er puesto y final
    await sql`
    INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, tipo_partido, estado, orden_partido)
    VALUES
        (${zonaId}, ${ids[0]}, ${ids[1]}, 'inicial_1', 'pendiente', 1),
        (${zonaId}, ${ids[2]}, ${ids[3]}, 'inicial_2', 'pendiente', 2),
        (${zonaId}, NULL, NULL, 'perdedores', 'pendiente', 3),
        (${zonaId}, NULL, NULL, 'ganadores', 'pendiente', 4)
    `;
  } else {
    // Para otras cantidades, o si ya hay partidos jugados en zonas de 3/4 (estado parcial),
    // generamos round-robin básico para completar los cruces faltantes.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${Math.min(ids[i], ids[j])}-${Math.max(ids[i], ids[j])}`;
        if (!playedPairs.has(key)) {
            // Check if this match already exists as pending?
            // We deleted pending matches above, so we are safe to insert.
            await sql`
            INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, tipo_partido, estado)
            VALUES (${zonaId}, ${ids[i]}, ${ids[j]}, 'round_robin', 'pendiente')
            `;
        }
      }
    }
  }
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(total: number): string {
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

async function scheduleZoneMatches(zonaId: number, torneoId: number) {
  // Leer configuración del torneo (horarios y canchas)
  const torneoInfo = await sql`
    SELECT f.hora_inicio_viernes, f.hora_inicio_sabado, f.hora_inicio,
           f.duracion_partido_min, f.dias_juego,
           COALESCE(s.capacidad_canchas, 1) as capacidad_canchas
    FROM fechas_torneo f
    LEFT JOIN sedes s ON s.nombre = f.sede
    WHERE f.id = ${torneoId}
  `;
  const t = torneoInfo[0];
  const duracionMin = parseInt(String(t?.duracion_partido_min || 60), 10);
  const numCanchas  = Math.max(1, t?.capacidad_canchas || 1);
  const availableDays = ["viernes","sabado"];
  const startTimes: Record<string, string> = {};
  availableDays.forEach((day: string) => {
    if (day === "viernes") startTimes[day] = (t?.hora_inicio_viernes || t?.hora_inicio || "18:00").substring(0, 5);
    else if (day === "sabado") startTimes[day] = (t?.hora_inicio_sabado || t?.hora_inicio || "14:00").substring(0, 5);
    else if (day === "domingo") startTimes[day] = (t?.hora_inicio || "10:00").substring(0, 5);
    else startTimes[day] = (t?.hora_inicio || "18:00").substring(0, 5);
  });

  // Determinar día preferente de la zona (usar el más común entre partidos existentes)
  const dayInfo = await sql`
    SELECT dia_partido FROM partidos_zona 
    WHERE zona_id = ${zonaId} AND dia_partido IS NOT NULL
  `;
  let zonaDay = availableDays[0];
  if (dayInfo.length > 0) {
    const freq: Record<string, number> = {};
    for (const d of dayInfo) {
      const v = d.dia_partido;
      if (!v) continue;
      freq[v] = (freq[v] || 0) + 1;
    }
    const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    zonaDay = best ? best[0] : zonaDay;
  }

  // Inicializar reloj por cancha
  const nextByCourt: number[] = Array.from({ length: numCanchas }, () => timeToMin(startTimes[zonaDay]));

  // Obtener pendientes y asignar horario/cancha en orden estable
  const pendientes = await sql`
    SELECT id FROM partidos_zona 
    WHERE zona_id = ${zonaId} AND estado = 'pendiente'
    ORDER BY orden_partido NULLS LAST, id
  `;
  for (const p of pendientes) {
    // Elegir cancha con menor tiempo disponible
    let bestCourt = 0;
    let bestMin = nextByCourt[0];
    for (let c = 1; c < numCanchas; c++) {
      if (nextByCourt[c] < bestMin) {
        bestMin = nextByCourt[c];
        bestCourt = c;
      }
    }
    const hora = minToTime(bestMin);
    // Actualizar partido
    await sql`
      UPDATE partidos_zona SET
        dia_partido = ${zonaDay},
        cancha_numero = ${bestCourt + 1},
        fecha_hora_programada = ${hora}
      WHERE id = ${p.id}
    `;
    // Avanzar reloj de esa cancha
    nextByCourt[bestCourt] = bestMin + duracionMin;
  }
}
