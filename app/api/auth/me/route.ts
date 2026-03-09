import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(null, { status: 401 });
  }

  if (session.rol === "jugador") {
    // First get basic player info including main category
    const playerInfo = await sql`
      SELECT u.jugador_id, j.nombre, j.apellido, j.puntos_totales, j.categoria_actual_id, c.nombre as categoria_actual_nombre
      FROM usuarios u
      LEFT JOIN jugadores j ON j.id = u.jugador_id
      LEFT JOIN categorias c ON c.id = j.categoria_actual_id
      WHERE u.id = ${session.userId}
    `;

    if (playerInfo.length === 0) {
       return NextResponse.json(session);
    }
    
    const player = playerInfo[0];
    
    // Get all categories for this player (including main category)
    const categories = await sql`
      SELECT DISTINCT c.id, c.nombre, c.orden_nivel
      FROM categorias c
      LEFT JOIN jugador_categorias jc ON jc.categoria_id = c.id AND jc.jugador_id = ${player.jugador_id}
      WHERE jc.jugador_id IS NOT NULL OR c.id = ${player.categoria_actual_id}
      ORDER BY c.orden_nivel ASC
    `;

    // Calculate ranking for the main category (categoria_actual_id)
    let ranking = null;
    if (player.categoria_actual_id) {
       const rankResult = await sql`
         SELECT COUNT(*) + 1 as rank
         FROM jugadores j
         WHERE j.categoria_actual_id = ${player.categoria_actual_id}
         AND j.puntos_totales > ${player.puntos_totales}
         AND j.estado = 'activo'
       `;
       if (rankResult.length > 0) {
         ranking = parseInt(rankResult[0].rank);
       }
    }

    return NextResponse.json({
      ...session,
      nombre: player.nombre || session.nombre,
      apellido: player.apellido || "",
      categoria_id: player.categoria_actual_id,
      categoria_nombre: player.categoria_actual_nombre,
      categorias: categories, // Array of {id, nombre}
      jugador_id: player.jugador_id,
      ranking: ranking,
      puntos_totales: player.puntos_totales || 0,
    });
  }

  return NextResponse.json(session);
}
