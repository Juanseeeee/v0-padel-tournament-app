import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { parejaId } = await request.json();

  if (!parejaId) {
    return NextResponse.json({ error: "parejaId requerido" }, { status: 400 });
  }

  // Verify the pareja belongs to this user
  const user = await sql`SELECT jugador_id FROM usuarios WHERE id = ${session.userId}`;
  const jugadorId = user[0]?.jugador_id;

  if (!jugadorId) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const pareja = await sql`
    SELECT pt.*, 
           (SELECT z.estado FROM zonas z 
            JOIN parejas_zona pz ON pz.zona_id = z.id 
            WHERE pz.pareja_id = pt.id LIMIT 1) as zona_estado
    FROM parejas_torneo pt
    WHERE pt.id = ${parejaId}
      AND (pt.jugador1_id = ${jugadorId} OR pt.jugador2_id = ${jugadorId})
  `;

  if (!pareja[0]) {
    return NextResponse.json({ error: "Pareja no encontrada o no pertenece al jugador" }, { status: 404 });
  }

  // Can only cancel if zona is not started or doesn't exist yet
  if (pareja[0].zona_estado && pareja[0].zona_estado !== "pendiente") {
    return NextResponse.json({ error: "No se puede cancelar una inscripción una vez que la zona ha comenzado" }, { status: 400 });
  }

  // Delete from parejas_zona if exists
  await sql`DELETE FROM parejas_zona WHERE pareja_id = ${parejaId}`;
  
  // Delete pareja
  await sql`DELETE FROM parejas_torneo WHERE id = ${parejaId}`;

  return NextResponse.json({ success: true });
}
