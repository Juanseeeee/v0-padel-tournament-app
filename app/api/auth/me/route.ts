import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(null, { status: 401 });
  }

  if (session.rol === "jugador") {
    // Resolve player points from puntos_categoria so the portal does not depend
    // on stale cached totals stored on jugadores.
    const playerInfo = await sql`
      SELECT
        u.jugador_id,
        j.nombre,
        j.apellido,
        j.categoria_actual_id,
        c.nombre as categoria_actual_nombre,
        COALESCE(pc_actual.puntos_acumulados, 0) AS puntos_categoria_actual,
        COALESCE(pc_total.total_puntos, 0) AS puntos_globales
      FROM usuarios u
      LEFT JOIN jugadores j ON j.id = u.jugador_id
      LEFT JOIN categorias c ON c.id = j.categoria_actual_id
      LEFT JOIN puntos_categoria pc_actual
        ON pc_actual.jugador_id = j.id
       AND pc_actual.categoria_id = j.categoria_actual_id
      LEFT JOIN (
        SELECT jugador_id, SUM(puntos_acumulados) AS total_puntos
        FROM puntos_categoria
        GROUP BY jugador_id
      ) pc_total ON pc_total.jugador_id = j.id
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
         LEFT JOIN puntos_categoria pc
           ON pc.jugador_id = j.id
          AND pc.categoria_id = ${player.categoria_actual_id}
         WHERE j.categoria_actual_id = ${player.categoria_actual_id}
           AND COALESCE(pc.puntos_acumulados, 0) > ${Number(player.puntos_categoria_actual || 0)}
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
      puntos_totales: Number(player.puntos_categoria_actual || 0),
      puntos_globales: Number(player.puntos_globales || 0),
    });
  }

  return NextResponse.json(session);
}
