import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: torneoId } = await params;
  const { pareja_torneo_id, zona_origen_id, zona_destino_id } = await request.json();

  if (!pareja_torneo_id || !zona_origen_id || !zona_destino_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (zona_origen_id === zona_destino_id) {
    return NextResponse.json({ error: "La zona de origen y destino son iguales" }, { status: 400 });
  }

  try {
    // Verify both zones belong to this tournament and aren't finalized
    const zonas = await sql`
      SELECT id, nombre, estado FROM zonas 
      WHERE id IN (${zona_origen_id}, ${zona_destino_id}) 
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
      WHERE zona_id = ${zona_origen_id}
        AND (pareja1_id = ${pareja_torneo_id} OR pareja2_id = ${pareja_torneo_id})
        AND estado = 'finalizado'
    `;

    if (parseInt(partidosJugados[0].count) > 0) {
      return NextResponse.json({ error: "No se puede mover una pareja que ya jugó partidos en su zona" }, { status: 400 });
    }

    // Remove pareja from origin zone
    await sql`
      DELETE FROM parejas_zona WHERE pareja_torneo_id = ${pareja_torneo_id} AND zona_id = ${zona_origen_id}
    `;

    // Delete pending matches involving this pareja in origin zone
    await sql`
      DELETE FROM partidos_zona 
      WHERE zona_id = ${zona_origen_id}
        AND (pareja1_id = ${pareja_torneo_id} OR pareja2_id = ${pareja_torneo_id})
        AND estado = 'pendiente'
    `;

    // Add pareja to destination zone
    await sql`
      INSERT INTO parejas_zona (zona_id, pareja_torneo_id, fecha_torneo_id)
      VALUES (${zona_destino_id}, ${pareja_torneo_id}, ${parseInt(torneoId)})
      ON CONFLICT DO NOTHING
    `;

    // Regenerate round-robin matches for both zones
    await regenerateZoneMatches(zona_origen_id, parseInt(torneoId));
    await regenerateZoneMatches(zona_destino_id, parseInt(torneoId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error moviendo pareja:", error);
    return NextResponse.json({ error: "Error moviendo pareja" }, { status: 500 });
  }
}

async function regenerateZoneMatches(zonaId: number, torneoId: number) {
  // Get current parejas in this zone
  const parejasZona = await sql`
    SELECT pareja_torneo_id FROM parejas_zona WHERE zona_id = ${zonaId}
  `;

  if (parejasZona.length < 2) return;

  // Delete only pending (unplayed) matches
  await sql`
    DELETE FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'pendiente'
  `;

  // Get existing finalized matches to avoid duplicates
  const existentes = await sql`
    SELECT pareja1_id, pareja2_id FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'finalizado'
  `;

  const existenteSet = new Set(
    existentes.map(e => `${Math.min(e.pareja1_id, e.pareja2_id)}-${Math.max(e.pareja1_id, e.pareja2_id)}`)
  );

  // Generate round-robin for all pairs not yet played
  const ids = parejasZona.map(p => p.pareja_torneo_id);
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
