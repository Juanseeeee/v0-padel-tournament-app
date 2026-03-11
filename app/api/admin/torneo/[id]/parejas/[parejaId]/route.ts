import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

async function regenerateZoneMatches(zonaId: number) {
  try {
    // Get current parejas in this zone, ordered by posicion_final (visual order)
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
    await sql`DELETE FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'pendiente'`;
    
    const ids = parejasZona.map((p: any) => p.pareja_id);
    
    if (ids.length === 3 && playedPairs.size === 0) {
      // Zona de 3: inicial, perdedor_vs_3, ganador_vs_3
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
      // Fallback to Round Robin
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${Math.min(ids[i], ids[j])}-${Math.max(ids[i], ids[j])}`;
          if (!playedPairs.has(key)) {
            await sql`
              INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, tipo_partido, estado)
              VALUES (${zonaId}, ${ids[i]}, ${ids[j]}, 'round_robin', 'pendiente')
            `;
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error in regenerateZoneMatches for zone ${zonaId}:`, e);
    // Don't throw, just log, so delete can proceed
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; parejaId: string }> }
) {
  const { parejaId } = await params;
  const pid = parseInt(parejaId);

  try {
    // 1. Verificar si está en zona y obtener zona_id
    const asignacion = await sql`SELECT zona_id FROM parejas_zona WHERE pareja_id = ${pid}`;
    const zonaId = asignacion.length > 0 ? asignacion[0].zona_id : null;

    if (zonaId) {
      // 2. Verificar si tiene partidos JUGADOS (finalizados)
      const jugados = await sql`
        SELECT id FROM partidos_zona
        WHERE zona_id = ${zonaId}
          AND (pareja1_id = ${pid} OR pareja2_id = ${pid})
          AND estado = 'finalizado'
      `;

      if (jugados.length > 0) {
        return NextResponse.json(
          { error: "No se puede eliminar una pareja que ya tiene partidos jugados. Elimine los resultados primero." },
          { status: 400 }
        );
      }

      // 3. Eliminar partidos pendientes de TODA la zona para regenerar estructura limpia
      await sql`DELETE FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'pendiente'`;

      // 4. Eliminar de la zona
      await sql`DELETE FROM parejas_zona WHERE pareja_id = ${pid}`;
      
      // 5. Regenerar partidos de la zona con las parejas restantes
      await regenerateZoneMatches(zonaId);
    }

    // 6. Eliminar la pareja de parejas_torneo
    await sql`DELETE FROM parejas_torneo WHERE id = ${pid}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pareja:", error);
    return NextResponse.json({ error: "Error al eliminar pareja" }, { status: 500 });
  }
}
