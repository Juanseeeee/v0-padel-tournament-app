import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { BRACKET_CONFIGS, ZONA_LETTERS } from "@/lib/bracket-config";

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(total: number): string {
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Global court scheduler.
 * Tracks the next free minute for each (day, court) pair.
 * Every assignment advances the clock on that court so nothing overlaps.
 */
class CourtScheduler {
  // key = "viernes_1" → next available minute on that court
  private next: Map<string, number> = new Map();
  private dur: number;
  private courts: number;

  constructor(dur: number, courts: number, startTimes: Record<string, string>) {
    this.dur = dur;
    this.courts = courts;
    for (const [day, time] of Object.entries(startTimes)) {
      for (let c = 1; c <= courts; c++) {
        this.next.set(`${day}_${c}`, timeToMin(time));
      }
    }
  }

  /** Reserve the earliest free slot on `dia`, considering a minimum start time. Returns { dia, cancha, hora, startMin }. */
  book(dia: string, minStart: number = 0): { dia: string; cancha: number; hora: string; startMin: number } {
    let bestCourt = 1;
    let bestMin = Infinity;

    for (let c = 1; c <= this.courts; c++) {
      const avail = this.next.get(`${dia}_${c}`)!;
      const actualStart = Math.max(avail, minStart);
      
      if (actualStart < bestMin) {
        bestMin = actualStart;
        bestCourt = c;
      }
    }

    // advance that court
    this.next.set(`${dia}_${bestCourt}`, bestMin + this.dur);
    return { dia, cancha: bestCourt, hora: minToTime(bestMin), startMin: bestMin };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { categoria_id } = body;
  const torneoId = parseInt(id);

  try {
    /* ── 1. Torneo info ───────────────────────────────── */
    const torneoInfo = await sql`
      SELECT f.hora_inicio_viernes, f.hora_inicio_sabado, f.hora_inicio,
             f.duracion_partido_min, f.dias_torneo, f.sede, f.dias_juego,
             COALESCE(s.capacidad_canchas, 1) as capacidad_canchas
      FROM fechas_torneo f
      LEFT JOIN sedes s ON s.nombre = f.sede
      WHERE f.id = ${torneoId}
    `;
    const t = torneoInfo[0];
    const duracionMin = parseInt(String(t?.duracion_partido_min || 60), 10);
    const numCanchas  = Math.max(1, t?.capacidad_canchas || 1);
    const diasJuegoRaw = t?.dias_juego || "viernes,sabado,domingo";
    const availableDays = diasJuegoRaw.split(",").map((d: string) => d.trim());
    
    // Determine start times for each available day
    const startTimes: Record<string, string> = {};
    availableDays.forEach((day: string) => {
      if (day === "viernes") startTimes[day] = (t?.hora_inicio_viernes || t?.hora_inicio || "18:00").substring(0, 5);
      else if (day === "sabado") startTimes[day] = (t?.hora_inicio_sabado || t?.hora_inicio || "14:00").substring(0, 5);
      else if (day === "domingo") startTimes[day] = (t?.hora_inicio || "10:00").substring(0, 5);
      else startTimes[day] = (t?.hora_inicio || "18:00").substring(0, 5);
    });

    /* ── 2. Parejas with preferences ─────────────────── */
    const parejas = await sql`
      SELECT id, cabeza_serie, dia_preferido, hora_disponible
      FROM parejas_torneo
      WHERE fecha_torneo_id = ${torneoId}
        AND categoria_id = ${categoria_id}
      ORDER BY cabeza_serie DESC, RANDOM()
    `;

    if (parejas.length < 6) {
      return NextResponse.json(
        { error: "Se necesitan al menos 6 parejas para generar zonas" },
        { status: 400 }
      );
    }

    const numParejas = parejas.length;
    const config = BRACKET_CONFIGS[numParejas];
    if (!config) {
      return NextResponse.json(
        { error: `No hay configuracion para ${numParejas} parejas. Soportado: 6-35.` },
        { status: 400 }
      );
    }

    const zonaSizes = config.zonas;
    const numZonas  = zonaSizes.length;

    /* ── 3. Cleanup ──────────────────────────────────── */
    const zonasExistentes = await sql`
      SELECT id FROM zonas WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoria_id}
    `;
    for (const zona of zonasExistentes) {
      await sql`DELETE FROM partidos_zona WHERE zona_id = ${zona.id}`;
      await sql`DELETE FROM parejas_zona  WHERE zona_id = ${zona.id}`;
    }
    await sql`DELETE FROM zonas  WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoria_id}`;
    await sql`DELETE FROM llaves WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoria_id}`;

    /* ── 4. Separate cabezas / preferencias ───────────── */
    const cabezas = parejas.filter((p: any) => p.cabeza_serie);
    const resto   = parejas.filter((p: any) => !p.cabeza_serie);

    const prefViernes = resto.filter((p: any) => p.dia_preferido === "viernes");
    const prefSabado  = resto.filter((p: any) => p.dia_preferido === "sabado");
    const sinPref     = resto.filter((p: any) => !p.dia_preferido);

    /* ── 5. Decide how many zones per day ─────────────── */
    let zonasSabado = 0;
    if (prefSabado.length > 0) {
      zonasSabado = Math.max(1, Math.round(prefSabado.length / 3));
      zonasSabado = Math.min(zonasSabado, numZonas - 1);
    }

    // Zone indices: viernes first, sabado at the end
    const distribucion: { ids: number[]; dia: string }[] = Array.from(
      { length: numZonas },
      (_, i) => ({
        ids: [],
        dia: i >= numZonas - zonasSabado ? "sabado" : "viernes",
      })
    );

    const viernesIdx = distribucion.map((d, i) => ({ d, i })).filter(x => x.d.dia === "viernes").map(x => x.i);
    const sabadoIdx  = distribucion.map((d, i) => ({ d, i })).filter(x => x.d.dia === "sabado").map(x => x.i);

    /* ── 6. Place cabezas de serie (1 per zone) ───────── */
    let cIdx = 0;
    for (let i = 0; i < numZonas && cIdx < cabezas.length; i++) {
      distribucion[i].ids.push(cabezas[cIdx].id);
      cIdx++;
    }
    while (cIdx < cabezas.length) {
      sinPref.push(cabezas[cIdx]);
      cIdx++;
    }

    /* ── 7. Fill sabado zones with sabado-pref ────────── */
    let sI = 0;
    for (const zi of sabadoIdx) {
      while (distribucion[zi].ids.length < zonaSizes[zi] && sI < prefSabado.length) {
        distribucion[zi].ids.push(prefSabado[sI].id);
        sI++;
      }
    }
    while (sI < prefSabado.length) { sinPref.push(prefSabado[sI]); sI++; }

    /* ── 8. Fill viernes zones with viernes-pref ──────── */
    let vI = 0;
    for (const zi of viernesIdx) {
      while (distribucion[zi].ids.length < zonaSizes[zi] && vI < prefViernes.length) {
        distribucion[zi].ids.push(prefViernes[vI].id);
        vI++;
      }
    }
    while (vI < prefViernes.length) { sinPref.push(prefViernes[vI]); vI++; }

    /* ── 9. Fill remaining with flexible (serpentine) ─── */
    const allIdx = [...viernesIdx, ...sabadoIdx];
    let fI = 0, ai = 0, dir = 1;
    while (fI < sinPref.length) {
      const zi = allIdx[ai];
      if (distribucion[zi].ids.length < zonaSizes[zi]) {
        distribucion[zi].ids.push(sinPref[fI].id);
        fI++;
      }
      ai += dir;
      if (ai >= allIdx.length) { ai = allIdx.length - 1; dir = -1; }
      else if (ai < 0) { ai = 0; dir = 1; }
      // safety
      if (fI > 0 && ai === 0 && dir === 1 && !distribucion.some((d, i) => d.ids.length < zonaSizes[i])) break;
    }

    /* ── 10. Build hora-preference map (per pareja) ──── */
    const horaMinMap = new Map<number, number>();
    for (const p of parejas) {
      if (p.hora_disponible) {
        horaMinMap.set(p.id, timeToMin(p.hora_disponible.substring(0, 5)));
      }
    }

    /* ── 11. For each zona, sort parejas so late-available ones
             play later matches. This way the zone starts at
             the configured hour and late parejas get later slots. */
    for (const d of distribucion) {
      if (d.ids.length <= 1) continue;
      // Sort: parejas WITHOUT hora restriction first, then by hora ascending
      d.ids.sort((a, b) => {
        const ha = horaMinMap.get(a) ?? 0;
        const hb = horaMinMap.get(b) ?? 0;
        return ha - hb;
      });
    }

    /* ── 12. Create zones + partidos via global scheduler ── */
    const scheduler = new CourtScheduler(duracionMin, numCanchas, startTimes);

    // Process viernes zones first (sequentially), then sabado
    const createOrder = [...viernesIdx, ...sabadoIdx];
    const zonasCreadas: any[] = [];

    for (const i of createOrder) {
      const ids = distribucion[i].ids;
      const dia = distribucion[i].dia;
      if (ids.length === 0) continue;

      const nombre = `Zona ${ZONA_LETTERS[i]}`;

      const zonaResult = await sql`
        INSERT INTO zonas (fecha_torneo_id, categoria_id, nombre, estado)
        VALUES (${torneoId}, ${categoria_id}, ${nombre}, 'en_juego')
        RETURNING id
      `;
      const zonaId = zonaResult[0].id;

      // Insert parejas_zona
      for (let j = 0; j < ids.length; j++) {
        await sql`
          INSERT INTO parejas_zona (zona_id, pareja_id, posicion_final)
          VALUES (${zonaId}, ${ids[j]}, ${j + 1})
        `;
      }

      // Define partidos (the order determines schedule order)
      type PartidoDef = { p1: number | null; p2: number | null; orden: number; tipo: string };
      const defs: PartidoDef[] = [];

      if (ids.length === 3) {
        // Match 1: pareja 0 vs 1, Match 2: loser vs 2, Match 3: winner vs 2
        defs.push(
          { p1: ids[0], p2: ids[1], orden: 1, tipo: "inicial" },
          { p1: null,   p2: ids[2], orden: 2, tipo: "perdedor_vs_3" },
          { p1: null,   p2: ids[2], orden: 3, tipo: "ganador_vs_3" },
        );
      } else if (ids.length === 4) {
        defs.push(
          { p1: ids[0], p2: ids[1], orden: 1, tipo: "inicial_1" },
          { p1: ids[2], p2: ids[3], orden: 2, tipo: "inicial_2" },
          { p1: null,   p2: null,   orden: 3, tipo: "perdedores" },
          { p1: null,   p2: null,   orden: 4, tipo: "ganadores" },
        );
      }

      // Schedule each match through the global scheduler (no overlap guaranteed)
      // Track start times to enforce dependencies
      const matchStartTimes: number[] = [];

      // Descanso minimo entre partidos de una misma pareja (en minutos)
      const descansoMin = 0;

      for (let i = 0; i < defs.length; i++) {
        const d2 = defs[i];
        let minStart = 0;
        
        // Logic for dependencies based on zone size and match order
        if (ids.length === 3) {
            // Match 1 (idx 0): No dependency
            // Match 2 (idx 1): After Match 1 + duracion + descanso
            // Match 3 (idx 2): After Match 2 + duracion + descanso
            if (i === 1 && matchStartTimes[0] !== undefined) {
                minStart = matchStartTimes[0] + duracionMin + descansoMin;
            } else if (i === 2 && matchStartTimes[1] !== undefined) {
                minStart = matchStartTimes[1] + duracionMin + descansoMin;
            }
        } else if (ids.length === 4) {
            // Match 1 (idx 0): No dependency
            // Match 2 (idx 1): No dependency
            // Match 3 (idx 2): After Match 1 (winners/losers) + duracion + descanso
            // Match 4 (idx 3): After Match 2 (winners/losers) + duracion + descanso
            // En zonas de 4, el partido 3 depende del 1 y 2, y el 4 depende del 1 y 2.
            // Simplificacion: Partidos 3 y 4 arrancan cuando terminan 1 y 2.
            if ((i === 2 || i === 3) && matchStartTimes[0] !== undefined && matchStartTimes[1] !== undefined) {
                const finP1 = matchStartTimes[0] + duracionMin;
                const finP2 = matchStartTimes[1] + duracionMin;
                minStart = Math.max(finP1, finP2) + descansoMin;
            }
        }

        // Si la zona es viernes y se pasa de las 23:00, intentar mover a sabado (si el torneo es de mas dias)
        // Pero por simplicidad, seguimos agendando en el dia asignado a la zona.

        const slot = scheduler.book(dia, minStart);
        matchStartTimes.push(slot.startMin);

        await sql`
          INSERT INTO partidos_zona (
            zona_id, pareja1_id, pareja2_id, orden_partido, tipo_partido, estado,
            dia_partido, cancha_numero, fecha_hora_programada
          ) VALUES (
            ${zonaId}, ${d2.p1}, ${d2.p2}, ${d2.orden}, ${d2.tipo}, 'pendiente',
            ${slot.dia}, ${slot.cancha}, ${slot.hora}
          )
        `;
      }

      // Collect schedule info for response
      const partidosInfo = defs.map((d2, pi) => {
        // Re-read what was just scheduled (slots were assigned in order)
        return { orden: d2.orden, tipo: d2.tipo };
      });
      zonasCreadas.push({ id: zonaId, nombre, parejas: ids.length, dia, partidos: partidosInfo.length });
    }

    // Marcar el torneo como "en_juego"
    await sql`UPDATE fechas_torneo SET estado = 'en_juego' WHERE id = ${torneoId}`;

    return NextResponse.json({
      success: true,
      zonas: zonasCreadas,
      scheduling: { canchas: numCanchas, start_times: startTimes, duracion_min: duracionMin },
    });
  } catch (error) {
    console.error("Error generating zonas:", error);
    return NextResponse.json(
      { error: "Error al generar zonas", details: String(error) },
      { status: 500 }
    );
  }
}
