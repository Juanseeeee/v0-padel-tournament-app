import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidoId: string }> }
) {
  const { partidoId } = await params;
  const body = await request.json();
  const { set1_p1, set1_p2, set2_p1, set2_p2, set3_p1, set3_p2 } = body;

  try {
    // Obtener datos del partido
    const partido = await sql`SELECT * FROM partidos_zona WHERE id = ${parseInt(partidoId)}`;
    if (partido.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    const p = partido[0];

    // Determinar ganador
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
    const completado = ganador_id !== null;

    // Actualizar partido
    await sql`
      UPDATE partidos_zona SET
        set1_p1 = ${set1_p1},
        set1_p2 = ${set1_p2},
        set2_p1 = ${set2_p1},
        set2_p2 = ${set2_p2},
        set3_p1 = ${set3_p1},
        set3_p2 = ${set3_p2},
        ganador_id = ${ganador_id},
        completado = ${completado}
      WHERE id = ${parseInt(partidoId)}
    `;

    // Recalcular estadísticas de la zona
    await recalcularEstadisticasZona(p.zona_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating partido:", error);
    return NextResponse.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}

async function recalcularEstadisticasZona(zonaId: number) {
  // Obtener todas las parejas de la zona
  const parejasZona = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${zonaId}`;

  for (const pz of parejasZona) {
    const parejaId = pz.pareja_id;

    // Contar partidos ganados/perdidos y sets
    const estadisticas = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE ganador_id = ${parejaId} AND completado = true) as ganados,
        COUNT(*) FILTER (WHERE ganador_id != ${parejaId} AND ganador_id IS NOT NULL AND completado = true) as perdidos,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          (CASE WHEN set1_p1 > set1_p2 THEN 1 ELSE 0 END) +
          (CASE WHEN set2_p1 > set2_p2 THEN 1 ELSE 0 END) +
          (CASE WHEN set3_p1 IS NOT NULL AND set3_p1 > set3_p2 THEN 1 ELSE 0 END)
        ELSE 
          (CASE WHEN set1_p2 > set1_p1 THEN 1 ELSE 0 END) +
          (CASE WHEN set2_p2 > set2_p1 THEN 1 ELSE 0 END) +
          (CASE WHEN set3_p2 IS NOT NULL AND set3_p2 > set3_p1 THEN 1 ELSE 0 END)
        END), 0) as sets_ganados,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          (CASE WHEN set1_p1 < set1_p2 THEN 1 ELSE 0 END) +
          (CASE WHEN set2_p1 < set2_p2 THEN 1 ELSE 0 END) +
          (CASE WHEN set3_p1 IS NOT NULL AND set3_p1 < set3_p2 THEN 1 ELSE 0 END)
        ELSE 
          (CASE WHEN set1_p2 < set1_p1 THEN 1 ELSE 0 END) +
          (CASE WHEN set2_p2 < set2_p1 THEN 1 ELSE 0 END) +
          (CASE WHEN set3_p2 IS NOT NULL AND set3_p2 < set3_p1 THEN 1 ELSE 0 END)
        END), 0) as sets_perdidos,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          COALESCE(set1_p1, 0) + COALESCE(set2_p1, 0) + COALESCE(set3_p1, 0)
        ELSE 
          COALESCE(set1_p2, 0) + COALESCE(set2_p2, 0) + COALESCE(set3_p2, 0)
        END), 0) as games_ganados,
        COALESCE(SUM(CASE WHEN pareja1_id = ${parejaId} THEN 
          COALESCE(set1_p2, 0) + COALESCE(set2_p2, 0) + COALESCE(set3_p2, 0)
        ELSE 
          COALESCE(set1_p1, 0) + COALESCE(set2_p1, 0) + COALESCE(set3_p1, 0)
        END), 0) as games_perdidos
      FROM partidos_zona
      WHERE zona_id = ${zonaId} AND (pareja1_id = ${parejaId} OR pareja2_id = ${parejaId})
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
