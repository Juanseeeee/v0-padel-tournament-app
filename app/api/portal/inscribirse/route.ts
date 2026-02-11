import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { fecha_torneo_id, companero_id, dia_preferido, hora_disponible } = body;

  // Get current user's jugador_id and categoria
  const user = await sql`
    SELECT u.jugador_id, jc.categoria_id
    FROM usuarios u
    JOIN jugador_categorias jc ON jc.jugador_id = u.jugador_id
    WHERE u.id = ${session.userId}
    LIMIT 1
  `;

  if (!user[0]?.jugador_id) {
    return NextResponse.json({ error: "No se encontro tu perfil de jugador" }, { status: 400 });
  }

  const jugadorId = user[0].jugador_id;
  const categoriaId = user[0].categoria_id;

  // Verify the torneo is open and matches the category
  const torneo = await sql`
    SELECT id, categoria_id, estado FROM fechas_torneo 
    WHERE id = ${fecha_torneo_id} AND estado = 'programada' AND categoria_id = ${categoriaId}
  `;
  if (!torneo[0]) {
    return NextResponse.json({ error: "Torneo no disponible" }, { status: 400 });
  }

  // Verify companion is in the same category
  const companero = await sql`
    SELECT j.id FROM jugadores j
    JOIN jugador_categorias jc ON jc.jugador_id = j.id
    WHERE j.id = ${companero_id} AND jc.categoria_id = ${categoriaId} AND j.estado = 'activo'
  `;
  if (!companero[0]) {
    return NextResponse.json({ error: "El companero no esta en tu categoria" }, { status: 400 });
  }

  // Check neither player is already enrolled in this torneo
  const existing = await sql`
    SELECT id FROM parejas_torneo 
    WHERE fecha_torneo_id = ${fecha_torneo_id}
      AND (jugador1_id = ${jugadorId} OR jugador2_id = ${jugadorId} 
           OR jugador1_id = ${companero_id} OR jugador2_id = ${companero_id})
  `;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Vos o tu companero ya estan inscriptos en este torneo" }, { status: 400 });
  }

  // Get next pareja number
  const maxNum = await sql`
    SELECT COALESCE(MAX(numero_pareja), 0) as max_num 
    FROM parejas_torneo WHERE fecha_torneo_id = ${fecha_torneo_id}
  `;
  const numero_pareja = (maxNum[0]?.max_num || 0) + 1;

  // Create the pareja
  await sql`
    INSERT INTO parejas_torneo (fecha_torneo_id, jugador1_id, jugador2_id, categoria_id, numero_pareja, cabeza_serie, dia_preferido, hora_disponible)
    VALUES (${fecha_torneo_id}, ${jugadorId}, ${companero_id}, ${categoriaId}, ${numero_pareja}, false, ${dia_preferido || null}, ${hora_disponible || null})
  `;

  return NextResponse.json({ success: true });
}
