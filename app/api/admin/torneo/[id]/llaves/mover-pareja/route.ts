import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const torneoId = params.id;
    const body = await request.json();
    const { 
      pareja_id, 
      llave_origen_id, 
      llave_destino_id, 
      posicion_destino // 'p1' or 'p2'
    } = body;

    if (!pareja_id || !llave_origen_id || !llave_destino_id || !posicion_destino) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // 1. Fetch llaves
    const llaves = await sql`
      SELECT * FROM llaves 
      WHERE id IN (${llave_origen_id}, ${llave_destino_id}) 
      AND fecha_torneo_id = ${torneoId}
    `;

    if (llaves.length === 0) {
        return NextResponse.json({ error: "Llaves no encontradas" }, { status: 404 });
    }

    // Handle case where origin and destination are the same (swap within match)
    const origen = llaves.find(l => l.id === llave_origen_id);
    const destino = llaves.find(l => l.id === llave_destino_id);

    if (!origen || !destino) {
        return NextResponse.json({ error: "Llaves no válidas" }, { status: 404 });
    }

    // 2. Validate Phase
    if (origen.ronda !== destino.ronda) {
      return NextResponse.json({ error: "No se pueden mover parejas entre diferentes fases" }, { status: 400 });
    }

    // 3. Validate Match Status
    if (origen.estado === 'finalizado' || destino.estado === 'finalizado') {
      return NextResponse.json({ error: "No se pueden modificar partidos ya jugados" }, { status: 400 });
    }

    // 4. Determine source position
    let posicion_origen = '';
    if (origen.pareja1_id === pareja_id) posicion_origen = 'p1';
    else if (origen.pareja2_id === pareja_id) posicion_origen = 'p2';
    else {
      return NextResponse.json({ error: "La pareja no está en la llave de origen" }, { status: 400 });
    }

    // 5. Determine target pair (for swap)
    const targetParejaId = posicion_destino === 'p1' ? destino.pareja1_id : destino.pareja2_id;
    
    const origenParejaJugadores = posicion_origen === 'p1' ? origen.pareja1_jugadores : origen.pareja2_jugadores;
    const destinoParejaJugadores = posicion_destino === 'p1' ? destino.pareja1_jugadores : destino.pareja2_jugadores;

    // 6. Perform Swap
    if (origen.id === destino.id) {
       // Swap within same match
       // If source is p1 and target is p2, just swap them
       // If source is p1 and target is p1, do nothing
       if (posicion_origen === posicion_destino) {
           return NextResponse.json({ success: true }); // No change
       }

       await sql`
         UPDATE llaves SET
           pareja1_id = ${origen.pareja2_id},
           pareja2_id = ${origen.pareja1_id},
           pareja1_jugadores = ${origen.pareja2_jugadores},
           pareja2_jugadores = ${origen.pareja1_jugadores}
         WHERE id = ${origen.id}
       `;
    } else {
       // Update Origen (takes what was at destination)
       if (posicion_origen === 'p1') {
           await sql`
             UPDATE llaves SET
               pareja1_id = ${targetParejaId},
               pareja1_jugadores = ${destinoParejaJugadores}
             WHERE id = ${origen.id}
           `;
       } else {
           await sql`
             UPDATE llaves SET
               pareja2_id = ${targetParejaId},
               pareja2_jugadores = ${destinoParejaJugadores}
             WHERE id = ${origen.id}
           `;
       }

       // Update Destino (takes dragged pair)
       if (posicion_destino === 'p1') {
           await sql`
             UPDATE llaves SET
               pareja1_id = ${pareja_id},
               pareja1_jugadores = ${origenParejaJugadores}
             WHERE id = ${destino.id}
           `;
       } else {
           await sql`
             UPDATE llaves SET
               pareja2_id = ${pareja_id},
               pareja2_jugadores = ${origenParejaJugadores}
             WHERE id = ${destino.id}
           `;
       }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno al mover la pareja" }, { status: 500 });
  }
}
