import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET - Obtener detalle de una zona con sus partidos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zonaId: string }> }
) {
  const { zonaId } = await params;

  try {
    // Obtener zona
    const [zona] = await sql`
      SELECT z.*, c.nombre as categoria_nombre
      FROM zonas z
      LEFT JOIN categorias c ON c.id = z.categoria_id
      WHERE z.id = ${parseInt(zonaId)}
    `;

    if (!zona) {
      return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
    }

    // Obtener parejas de la zona con datos de jugadores
    const parejas = await sql`
      SELECT 
        pz.id as pareja_zona_id,
        pz.posicion_final,
        pz.partidos_ganados,
        pz.partidos_perdidos,
        pz.sets_ganados,
        pz.sets_perdidos,
        pz.games_ganados,
        pz.games_perdidos,
        pt.id as pareja_torneo_id,
        pt.cabeza_serie,
        j1.nombre as j1_nombre, j1.apellido as j1_apellido,
        j2.nombre as j2_nombre, j2.apellido as j2_apellido
      FROM parejas_zona pz
      JOIN parejas_torneo pt ON pt.id = pz.pareja_id
      JOIN jugadores j1 ON j1.id = pt.jugador1_id
      JOIN jugadores j2 ON j2.id = pt.jugador2_id
      WHERE pz.zona_id = ${parseInt(zonaId)}
      ORDER BY pz.partidos_ganados DESC, (pz.sets_ganados - pz.sets_perdidos) DESC, pz.posicion_final
    `;

    // Obtener partidos de la zona
    const partidos = await sql`
      SELECT 
        p.*,
        j1_1.nombre as p1_j1_nombre, j1_1.apellido as p1_j1_apellido,
        j1_2.nombre as p1_j2_nombre, j1_2.apellido as p1_j2_apellido,
        j2_1.nombre as p2_j1_nombre, j2_1.apellido as p2_j1_apellido,
        j2_2.nombre as p2_j2_nombre, j2_2.apellido as p2_j2_apellido
      FROM partidos_zona p
      LEFT JOIN parejas_torneo pt1 ON pt1.id = p.pareja1_id
      LEFT JOIN jugadores j1_1 ON j1_1.id = pt1.jugador1_id
      LEFT JOIN jugadores j1_2 ON j1_2.id = pt1.jugador2_id
      LEFT JOIN parejas_torneo pt2 ON pt2.id = p.pareja2_id
      LEFT JOIN jugadores j2_1 ON j2_1.id = pt2.jugador1_id
      LEFT JOIN jugadores j2_2 ON j2_2.id = pt2.jugador2_id
      WHERE p.zona_id = ${parseInt(zonaId)}
      ORDER BY p.orden_partido
    `;

    // Reparar emparejamientos y ganador_id faltante
    try {
      const len = parejas.length;
      const norm = (s: string | null) => (s || "").trim().toLowerCase();
      const byKey: Record<string, any> = {};
      for (const p of partidos as any[]) {
        byKey[norm(p.tipo_partido)] = p;
      }
      const updateOps: any[] = [];

      const computeWinnerId = (p: any) => {
        const s1p1 = p.set1_pareja1; const s1p2 = p.set1_pareja2;
        const s2p1 = p.set2_pareja1; const s2p2 = p.set2_pareja2;
        const s3p1 = p.set3_pareja1; const s3p2 = p.set3_pareja2;
        let sp1 = 0, sp2 = 0;
        if (s1p1 !== null && s1p2 !== null) { if (s1p1 > s1p2) sp1++; else if (s1p2 > s1p1) sp2++; }
        if (s2p1 !== null && s2p2 !== null) { if (s2p1 > s2p2) sp1++; else if (s2p2 > s2p1) sp2++; }
        if (s3p1 !== null && s3p2 !== null) { if (s3p1 > s3p2) sp1++; else if (s3p2 > s3p1) sp2++; }
        if (!p.pareja1_id || !p.pareja2_id) return null;
        if (sp1 > sp2) return p.pareja1_id;
        if (sp2 > sp1) return p.pareja2_id;
        return null;
      };

      if (len === 3) {
        const m1 = byKey["inicial"] || byKey["incial"] || byKey["inicial_1"];
        const allParejaIds = (parejas as any[]).map(p => p.pareja_torneo_id);
        const id3 = (m1 && allParejaIds.length === 3) ? allParejaIds.find((pid: number) => pid !== m1.pareja1_id && pid !== m1.pareja2_id) : null;
        if (m1) {
          const ganadorInicial = m1.ganador_id || computeWinnerId(m1);
          const perdedorInicial = (ganadorInicial && m1.pareja1_id && m1.pareja2_id)
            ? (ganadorInicial === m1.pareja1_id ? m1.pareja2_id : m1.pareja1_id)
            : null;
          const perdMatch = byKey["perdedor_vs_3"] || byKey["perderdor_vs_3"] || byKey["perdedores"];
          const ganMatch  = byKey["ganador_vs_3"] || byKey["ganadores"];

          if (perdMatch) {
            if (!perdMatch.pareja1_id && perdedorInicial) {
              updateOps.push(sql`UPDATE partidos_zona SET pareja1_id = ${perdedorInicial} WHERE id = ${perdMatch.id}`);
            }
            if (!perdMatch.pareja2_id && id3) {
              updateOps.push(sql`UPDATE partidos_zona SET pareja2_id = ${id3} WHERE id = ${perdMatch.id}`);
            }
          }
          if (ganMatch) {
            if (!ganMatch.pareja1_id && ganadorInicial) {
              updateOps.push(sql`UPDATE partidos_zona SET pareja1_id = ${ganadorInicial} WHERE id = ${ganMatch.id}`);
            }
            if (!ganMatch.pareja2_id && id3) {
              updateOps.push(sql`UPDATE partidos_zona SET pareja2_id = ${id3} WHERE id = ${ganMatch.id}`);
            }
          }
        }
      }

      if (len === 4) {
        const m1 = byTipo["inicial_1"];
        const m2 = byTipo["inicial_2"];
        if (m1 && m2 && m1.estado === 'finalizado' && m2.estado === 'finalizado' && m1.ganador_id && m2.ganador_id) {
          const perd1 = m1.pareja1_id === m1.ganador_id ? m1.pareja2_id : m1.pareja1_id;
          const perd2 = m2.pareja1_id === m2.ganador_id ? m2.pareja2_id : m2.pareja1_id;
          if (byTipo["perdedores"] && (!byTipo["perdedores"].pareja1_id || !byTipo["perdedores"].pareja2_id)) {
            updateOps.push(sql`UPDATE partidos_zona SET pareja1_id = ${perd1}, pareja2_id = ${perd2} WHERE zona_id = ${parseInt(zonaId)} AND tipo_partido = 'perdedores'`);
          }
          if (byTipo["ganadores"] && (!byTipo["ganadores"].pareja1_id || !byTipo["ganadores"].pareja2_id)) {
            updateOps.push(sql`UPDATE partidos_zona SET pareja1_id = ${m1.ganador_id}, pareja2_id = ${m2.ganador_id} WHERE zona_id = ${parseInt(zonaId)} AND tipo_partido = 'ganadores'`);
          }
        }
      }

      // Completar ganador_id para partidos con sets cargados y normalizar estado
      for (const p of partidos as any[]) {
        const w = (!p.ganador_id) ? computeWinnerId(p) : p.ganador_id;
        if (!p.ganador_id && w) {
          updateOps.push(sql`UPDATE partidos_zona SET ganador_id = ${w}, estado = 'finalizado' WHERE id = ${p.id}`);
        } else if (p.ganador_id && p.estado !== 'finalizado') {
          updateOps.push(sql`UPDATE partidos_zona SET estado = 'finalizado' WHERE id = ${p.id}`);
        }
      }

      for (const op of updateOps) {
        await op;
      }

      // Recalcular estadísticas de parejas en la zona SIEMPRE
      const parejasZona = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${parseInt(zonaId)}`;
      for (const pz of parejasZona as any[]) {
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
          WHERE zona_id = ${parseInt(zonaId)} AND (pareja1_id = ${parejaId} OR pareja2_id = ${parejaId}) AND estado = 'finalizado'
        `;
        const stats = (estadisticas as any[])[0];
        await sql`
          UPDATE parejas_zona SET
            partidos_ganados = ${stats.ganados},
            partidos_perdidos = ${stats.perdidos},
            sets_ganados = ${stats.sets_ganados},
            sets_perdidos = ${stats.sets_perdidos},
            games_ganados = ${stats.games_ganados},
            games_perdidos = ${stats.games_perdidos}
          WHERE zona_id = ${parseInt(zonaId)} AND pareja_id = ${parejaId}
        `;
      }
    } catch {}

    // Releer partidos actualizados
    const partidos2 = await sql`
      SELECT 
        p.*,
        j1_1.nombre as p1_j1_nombre, j1_1.apellido as p1_j1_apellido,
        j1_2.nombre as p1_j2_nombre, j1_2.apellido as p1_j2_apellido,
        j2_1.nombre as p2_j1_nombre, j2_1.apellido as p2_j1_apellido,
        j2_2.nombre as p2_j2_nombre, j2_2.apellido as p2_j2_apellido
      FROM partidos_zona p
      LEFT JOIN parejas_torneo pt1 ON pt1.id = p.pareja1_id
      LEFT JOIN jugadores j1_1 ON j1_1.id = pt1.jugador1_id
      LEFT JOIN jugadores j1_2 ON j1_2.id = pt1.jugador2_id
      LEFT JOIN parejas_torneo pt2 ON pt2.id = p.pareja2_id
      LEFT JOIN jugadores j2_1 ON j2_1.id = pt2.jugador1_id
      LEFT JOIN jugadores j2_2 ON j2_2.id = pt2.jugador2_id
      WHERE p.zona_id = ${parseInt(zonaId)}
      ORDER BY p.orden_partido
    `;

    return NextResponse.json({
      zona,
      parejas,
      partidos: partidos2,
    });
  } catch (error) {
    console.error("Error fetching zona:", error);
    return NextResponse.json(
      { error: "Error al obtener zona", details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - Cerrar zona y calcular posiciones finales
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zonaId: string }> }
) {
  const { zonaId } = await params;
  const body = await request.json();
  const { estado } = body;

  try {
    // Si se está cerrando la zona, calcular posiciones finales
    if (estado === 'finalizada') {
      // Obtener parejas ordenadas por partidos ganados y diferencia de sets
      const parejas = await sql`
        SELECT pareja_id, partidos_ganados, sets_ganados, sets_perdidos
        FROM parejas_zona
        WHERE zona_id = ${parseInt(zonaId)}
        ORDER BY partidos_ganados DESC, (sets_ganados - sets_perdidos) DESC, sets_ganados DESC
      `;

      // Actualizar posiciones finales
      for (let i = 0; i < parejas.length; i++) {
        await sql`
          UPDATE parejas_zona 
          SET posicion_final = ${i + 1}
          WHERE zona_id = ${parseInt(zonaId)} AND pareja_id = ${parejas[i].pareja_id}
        `;
      }
    }

    // Actualizar estado de la zona
    await sql`
      UPDATE zonas SET estado = ${estado} WHERE id = ${parseInt(zonaId)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating zona:", error);
    return NextResponse.json(
      { error: "Error al actualizar zona", details: String(error) },
      { status: 500 }
    );
  }
}
