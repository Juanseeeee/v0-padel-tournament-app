import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zonaId: string }> }
) {
  const { id: torneoId, zonaId } = await params;
  const body = await request.json();
  const {
    pareja_id,
    opcion,
    destinos, // { [parejaId]: zonaDestinoId } for reestructurar
  } = body as {
    pareja_id: number;
    opcion: "vacante_final" | "reestructurar" | "organizar_3";
    destinos?: Record<number, number>;
  };

  if (!pareja_id || !opcion) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  try {
    const [zona] = await sql`
      SELECT * FROM zonas WHERE id = ${parseInt(zonaId)} AND fecha_torneo_id = ${parseInt(torneoId)}
    `;
    if (!zona) {
      return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
    }
    if (zona.estado === "finalizada") {
      return NextResponse.json({ error: "La zona ya está cerrada" }, { status: 400 });
    }

    // Remove pareja from zone
    await sql`DELETE FROM parejas_zona WHERE zona_id = ${parseInt(zonaId)} AND pareja_id = ${pareja_id}`;
    // Delete pending matches involving this pair
    await sql`
      DELETE FROM partidos_zona 
      WHERE zona_id = ${parseInt(zonaId)} 
        AND (pareja1_id = ${pareja_id} OR pareja2_id = ${pareja_id})
        AND estado = 'pendiente'
    `;

    const restantes = await sql`
      SELECT pareja_id FROM parejas_zona WHERE zona_id = ${parseInt(zonaId)} ORDER BY posicion_final
    `;
    const ids = restantes.map((r: any) => r.pareja_id);

    // Helper: reset zone schedule to desired format
    async function reorganizarZona3() {
      await sql`DELETE FROM partidos_zona WHERE zona_id = ${parseInt(zonaId)}`;
      if (ids.length !== 3) {
        return NextResponse.json({ error: "No hay 3 parejas para reorganizar la zona" }, { status: 400 });
      }
      // Create template: inicial, perdedor_vs_3 (p1 null), ganador_vs_3 (p1 null)
      await sql`
        INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, orden_partido, tipo_partido, estado)
        VALUES 
          (${parseInt(zonaId)}, ${ids[0]}, ${ids[1]}, 1, 'inicial', 'pendiente'),
          (${parseInt(zonaId)}, NULL, ${ids[2]}, 2, 'perdedor_vs_3', 'pendiente'),
          (${parseInt(zonaId)}, NULL, ${ids[2]}, 3, 'ganador_vs_3', 'pendiente')
      `;
    }

    if (opcion === "vacante_final") {
      if (ids.length !== 2) {
        return NextResponse.json({ error: "Se necesitan 2 parejas restantes para jugar la final" }, { status: 400 });
      }
      // Clear all matches in zone and create single final
      await sql`DELETE FROM partidos_zona WHERE zona_id = ${parseInt(zonaId)}`;
      await sql`
        INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, orden_partido, tipo_partido, estado)
        VALUES (${parseInt(zonaId)}, ${ids[0]}, ${ids[1]}, 1, 'final', 'pendiente')
      `;
    } else if (opcion === "organizar_3") {
      await reorganizarZona3();
    } else if (opcion === "reestructurar") {
      if (!destinos) {
        return NextResponse.json({ error: "Faltan destinos para reestructurar" }, { status: 400 });
      }
      // Move remaining pairs to provided destination zones
      for (const pid of ids) {
        const destZonaId = destinos[pid];
        if (!destZonaId) {
          return NextResponse.json({ error: `Falta zona destino para pareja ${pid}` }, { status: 400 });
        }
        // Remove from current (already done above for dropped pair). Ensure removal for pid in origin:
        await sql`DELETE FROM parejas_zona WHERE zona_id = ${parseInt(zonaId)} AND pareja_id = ${pid}`;
        // Delete pending matches for pid in origin zone
        await sql`
          DELETE FROM partidos_zona 
          WHERE zona_id = ${parseInt(zonaId)} 
            AND (pareja1_id = ${pid} OR pareja2_id = ${pid})
            AND estado = 'pendiente'
        `;
        // Add to destination zone
        await sql`INSERT INTO parejas_zona (zona_id, pareja_id) VALUES (${destZonaId}, ${pid}) ON CONFLICT DO NOTHING`;
        // Regenerate matches in destination zone (round-robin style without duplicating finalized)
        await regenerateZoneMatches(destZonaId, parseInt(torneoId));
      }
      // If origin zone quedó vacía, eliminar zona y sus partidos
      const countRest = await sql`SELECT COUNT(*) as count FROM parejas_zona WHERE zona_id = ${parseInt(zonaId)}`;
      if (parseInt(countRest[0].count) === 0) {
        await sql`DELETE FROM partidos_zona WHERE zona_id = ${parseInt(zonaId)}`;
        await sql`DELETE FROM zonas WHERE id = ${parseInt(zonaId)}`;
      } else {
        // Si quedaron 2 o 3, reorganizar acorde
        const nuevaLista = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${parseInt(zonaId)}`;
        if (nuevaLista.length === 3) {
          await reorganizarZona3();
        } else if (nuevaLista.length === 2) {
          await sql`DELETE FROM partidos_zona WHERE zona_id = ${parseInt(zonaId)}`;
          await sql`
            INSERT INTO partidos_zona (zona_id, pareja1_id, pareja2_id, orden_partido, tipo_partido, estado)
            VALUES (${parseInt(zonaId)}, ${nuevaLista[0].pareja_id}, ${nuevaLista[1].pareja_id}, 1, 'final', 'pendiente')
          `;
        }
      }
    }

    // Regenerate round-robin matches for origin zone if it still has 3+ and opcion not reestructurar
    if (opcion !== "reestructurar") {
      const restNow = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${parseInt(zonaId)}`;
      if (restNow.length >= 2) {
        // For zonas con 3 y formato especial ya insertado, no generar round-robin
        // Solo regenerar para 4+ (poco probable tras baja), o si restNow==2 dejamos la final creada
        if (restNow.length >= 4) {
          await regenerateZoneMatches(parseInt(zonaId), parseInt(torneoId));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en baja de pareja:", error);
    return NextResponse.json({ error: "Error al procesar baja de pareja" }, { status: 500 });
  }
}

async function regenerateZoneMatches(zonaId: number, torneoId: number) {
  const parejasZona = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${zonaId}`;
  if (parejasZona.length < 2) return;
  await sql`DELETE FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'pendiente'`;
  const existentes = await sql`
    SELECT pareja1_id, pareja2_id FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'finalizado'
  `;
  const existenteSet = new Set(
    existentes.map((e: any) => `${Math.min(e.pareja1_id, e.pareja2_id)}-${Math.max(e.pareja1_id, e.pareja2_id)}`)
  );
  const ids = parejasZona.map((p: any) => p.pareja_id);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = `${Math.min(ids[i], ids[j])}-${Math.max(ids[i], ids[j])}`;
      if (!existenteSet.has(key)) {
        await sql`
          INSERT INTO partidos_zona (zona_id, fecha_torneo_id, pareja1_id, pareja2_id, tipo_partido, estado)
          VALUES (${zonaId}, ${torneoId}, ${ids[i]}, ${ids[j]}, 'round_robin', 'pendiente')
        `;
      }
    }
  }
}
