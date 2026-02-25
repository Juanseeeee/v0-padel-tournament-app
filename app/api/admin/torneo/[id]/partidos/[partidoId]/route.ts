import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidoId: string }> }
) {
  const { partidoId } = await params;
  const body = await request.json();
  const { set1_p1, set1_p2, set2_p1, set2_p2, set3_p1, set3_p2, dia_partido, cancha_numero, fecha_hora_programada, orden_partido } = body as any;

  try {
    // Obtener datos del partido
    const partido = await sql`SELECT * FROM partidos_zona WHERE id = ${parseInt(partidoId)}`;
    if (partido.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    const p = partido[0];

    if (dia_partido !== undefined || cancha_numero !== undefined || fecha_hora_programada !== undefined || orden_partido !== undefined) {
      await sql`
        UPDATE partidos_zona SET
          dia_partido = ${dia_partido ?? p.dia_partido},
          cancha_numero = ${cancha_numero ?? p.cancha_numero},
          fecha_hora_programada = ${fecha_hora_programada ?? p.fecha_hora_programada},
          orden_partido = ${orden_partido ?? p.orden_partido}
        WHERE id = ${parseInt(partidoId)}
      `;
      return NextResponse.json({ success: true });
    }

    if (set1_p1 !== null && set1_p2 !== null && set2_p1 !== null && set2_p2 !== null) {
      const getSetWinner = (p1: number, p2: number) => {
        if (p1 >= 6 && p1 - p2 >= 2) return 1;
        if (p1 === 7 && (p2 === 5 || p2 === 6)) return 1;
        if (p2 >= 6 && p2 - p1 >= 2) return 2;
        if (p2 === 7 && (p1 === 5 || p1 === 6)) return 2;
        return 0;
      };

      const w1 = getSetWinner(set1_p1, set1_p2);
      const w2 = getSetWinner(set2_p1, set2_p2);

      if (w1 !== 0 && w1 === w2) {
        if (set3_p1 !== null || set3_p2 !== null) {
           return NextResponse.json({ error: "El partido ya está definido en 2 sets. No se puede ingresar un 3er set." }, { status: 400 });
        }
      }
    }

    let setsP1 = 0;
    let setsP2 = 0;
    let gamesP1 = 0;
    let gamesP2 = 0;

    if (set1_p1 !== null && set1_p2 !== null) {
      gamesP1 += set1_p1;
      gamesP2 += set1_p2;
      if (set1_p1 > set1_p2) setsP1++;
      else if (set1_p2 > set1_p1) setsP2++;
    }
    if (set2_p1 !== null && set2_p2 !== null) {
      gamesP1 += set2_p1;
      gamesP2 += set2_p2;
      if (set2_p1 > set2_p2) setsP1++;
      else if (set2_p2 > set2_p1) setsP2++;
    }
    if (set3_p1 !== null && set3_p2 !== null) {
      gamesP1 += set3_p1;
      gamesP2 += set3_p2;
      if (set3_p1 > set3_p2) setsP1++;
      else if (set3_p2 > set3_p1) setsP2++;
    }

    const ganador_id = setsP1 > setsP2 ? p.pareja1_id : setsP2 > setsP1 ? p.pareja2_id : null;
    const estado = ganador_id !== null ? 'finalizado' : 'pendiente';

    await sql`
      UPDATE partidos_zona SET
        set1_pareja1 = ${set1_p1},
        set1_pareja2 = ${set1_p2},
        set2_pareja1 = ${set2_p1},
        set2_pareja2 = ${set2_p2},
        set3_pareja1 = ${set3_p1},
        set3_pareja2 = ${set3_p2},
        ganador_id = ${ganador_id},
        estado = ${estado}
      WHERE id = ${parseInt(partidoId)}
    `;

    // Actualizar partidos dependientes según formato de la zona
    const tipoPartido = p.tipo_partido as string;
    const zonaId = p.zona_id as number;
    const perdedor_id = ganador_id === p.pareja1_id ? p.pareja2_id : (ganador_id === p.pareja2_id ? p.pareja1_id : null);

    if (tipoPartido === 'inicial') {
      // Zona de 3: setear participantes de los partidos siguientes
      if (perdedor_id) {
        await sql`
          UPDATE partidos_zona
          SET pareja1_id = ${perdedor_id}
          WHERE zona_id = ${zonaId} AND tipo_partido = 'perdedor_vs_3'
        `;
      }
      if (ganador_id) {
        await sql`
          UPDATE partidos_zona
          SET pareja1_id = ${ganador_id}
          WHERE zona_id = ${zonaId} AND tipo_partido = 'ganador_vs_3'
        `;
      }
    }

    if (tipoPartido === 'inicial_1' || tipoPartido === 'inicial_2') {
      // Zona de 4: si ambos iniciales están finalizados, completar perdedores y ganadores
      const [otroInicial] = await sql`
        SELECT * FROM partidos_zona 
        WHERE zona_id = ${zonaId} 
          AND tipo_partido IN ('inicial_1', 'inicial_2')
          AND tipo_partido != ${tipoPartido}
          AND estado = 'finalizado'
      `;

      if (otroInicial) {
        const ganador1 = tipoPartido === 'inicial_1' ? ganador_id : otroInicial.ganador_id;
        const ganador2 = tipoPartido === 'inicial_2' ? ganador_id : otroInicial.ganador_id;
        const perdedor1 = tipoPartido === 'inicial_1' ? perdedor_id : (otroInicial.pareja1_id === otroInicial.ganador_id ? otroInicial.pareja2_id : otroInicial.pareja1_id);
        const perdedor2 = tipoPartido === 'inicial_2' ? perdedor_id : (otroInicial.pareja1_id === otroInicial.ganador_id ? otroInicial.pareja2_id : otroInicial.pareja1_id);

        await sql`
          UPDATE partidos_zona
          SET pareja1_id = ${perdedor1}, pareja2_id = ${perdedor2}
          WHERE zona_id = ${zonaId} AND tipo_partido = 'perdedores'
        `;
        await sql`
          UPDATE partidos_zona
          SET pareja1_id = ${ganador1}, pareja2_id = ${ganador2}
          WHERE zona_id = ${zonaId} AND tipo_partido = 'ganadores'
        `;
      }
    }

    await recalcularEstadisticasZona(p.zona_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating partido:", error);
    return NextResponse.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}

async function recalcularEstadisticasZona(zonaId: number) {
  const parejasZona = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${zonaId}`;

  for (const pz of parejasZona) {
    const parejaId = pz.pareja_id;

    const estadisticas = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE ganador_id = ${parejaId} AND estado = 'finalizado') as ganados,
        COUNT(*) FILTER (WHERE ganador_id != ${parejaId} AND ganador_id IS NOT NULL AND estado = 'finalizado') as perdidos,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          (CASE WHEN COALESCE(set1_pareja1, 0) > COALESCE(set1_pareja2, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN COALESCE(set2_pareja1, 0) > COALESCE(set2_pareja2, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN set3_pareja1 IS NOT NULL AND set3_pareja1 > set3_pareja2 THEN 1 ELSE 0 END)
        ELSE 
          (CASE WHEN COALESCE(set1_pareja2, 0) > COALESCE(set1_pareja1, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN COALESCE(set2_pareja2, 0) > COALESCE(set2_pareja1, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN set3_pareja2 IS NOT NULL AND set3_pareja2 > set3_pareja1 THEN 1 ELSE 0 END)
        END), 0) as sets_ganados,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          (CASE WHEN COALESCE(set1_pareja1, 0) < COALESCE(set1_pareja2, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN COALESCE(set2_pareja1, 0) < COALESCE(set2_pareja2, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN set3_pareja1 IS NOT NULL AND set3_pareja1 < set3_pareja2 THEN 1 ELSE 0 END)
        ELSE 
          (CASE WHEN COALESCE(set1_pareja2, 0) < COALESCE(set1_pareja1, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN COALESCE(set2_pareja2, 0) < COALESCE(set2_pareja1, 0) THEN 1 ELSE 0 END) +
          (CASE WHEN set3_pareja2 IS NOT NULL AND set3_pareja2 < set3_pareja1 THEN 1 ELSE 0 END)
        END), 0) as sets_perdidos,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          COALESCE(set1_pareja1, 0) + COALESCE(set2_pareja1, 0) + COALESCE(set3_pareja1, 0)
        ELSE 
          COALESCE(set1_pareja2, 0) + COALESCE(set2_pareja2, 0) + COALESCE(set3_pareja2, 0)
        END), 0) as games_ganados,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          COALESCE(set1_pareja2, 0) + COALESCE(set2_pareja2, 0) + COALESCE(set3_pareja2, 0)
        ELSE 
          COALESCE(set1_pareja1, 0) + COALESCE(set2_pareja1, 0) + COALESCE(set3_pareja1, 0)
        END), 0) as games_perdidos
      FROM partidos_zona
      WHERE zona_id = ${zonaId} AND (pareja1_id = ${parejaId} OR pareja2_id = ${parejaId}) AND estado = 'finalizado'
    `;

    const stats = estadisticas[0];

    await sql`
      UPDATE parejas_zona SET
        partidos_ganados = ${stats.ganados},
        partidos_perdidos = ${stats.perdidos},
        sets_ganados = ${stats.sets_ganados},
        sets_perdidos = ${stats.sets_perdidos},
        games_ganados = ${stats.games_ganados},
        games_perdidos = ${stats.games_perdidos}
      WHERE zona_id = ${zonaId} AND pareja_id = ${parejaId}
    `;
  }
}
