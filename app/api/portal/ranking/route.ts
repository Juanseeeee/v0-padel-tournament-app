import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoriaFromQuery = searchParams.get("categoria_id");
  let categoriaId: number | null = categoriaFromQuery ? Number(categoriaFromQuery) : null;
  let miJugadorId: number | null = null;

  // If no categoria_id provided, try to infer from session
  if (!categoriaId) {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "categoria_id requerido" }, { status: 400 });
    }
    const user = await sql`SELECT jugador_id FROM usuarios WHERE id = ${session.userId}`;
    if (!user[0]?.jugador_id) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }
    miJugadorId = Number(user[0].jugador_id);
    const jugadorCat = await sql`
      SELECT categoria_id FROM jugador_categorias WHERE jugador_id = ${miJugadorId}
    `;
    if (!jugadorCat[0]) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }
    categoriaId = Number(jugadorCat[0].categoria_id);
  }

  try {
    // Get all fechas (torneos) for this category
    const fechas = await sql`
      SELECT id, numero_fecha, fecha_calendario, estado
      FROM fechas_torneo
      WHERE categoria_id = ${categoriaId}
      ORDER BY numero_fecha ASC
    `;

    // Get all jugadores in this category (including 0 points)
    const jugadores = await sql`
      SELECT 
        j.id, j.nombre, j.apellido, j.localidad,
        COALESCE(pc.puntos_acumulados, 0) AS puntos_totales,
        COALESCE(pc.torneos_jugados, 0) AS torneos_jugados
      FROM jugadores j
      LEFT JOIN puntos_categoria pc 
        ON pc.jugador_id = j.id AND pc.categoria_id = ${categoriaId}
      WHERE j.categoria_actual_id = ${categoriaId}
        AND j.estado = 'activo'
      ORDER BY COALESCE(pc.puntos_acumulados, 0) DESC, j.nombre ASC
    `;

    // Get points per fecha for each jugador
    const puntosPorFecha = await sql`
      SELECT hp.jugador_id, hp.fecha_torneo_id, hp.puntos_acumulados, hp.motivo
      FROM historial_puntos hp
      WHERE hp.categoria_id = ${categoriaId}
    `;

    // Also check participaciones as fallback
    const participaciones = await sql`
      SELECT p.jugador_id, p.fecha_torneo_id, p.puntos_obtenidos, p.instancia_alcanzada
      FROM participaciones p
      WHERE p.categoria_id = ${categoriaId}
    `;

    // Build a lookup: jugador_id -> { fecha_torneo_id -> {puntos, instancia} }
    const puntosMap: Record<number, Record<number, { puntos: number; instancia: string }>> = {};
    
    // First from participaciones
    for (const p of participaciones) {
      if (!puntosMap[p.jugador_id]) puntosMap[p.jugador_id] = {};
      puntosMap[p.jugador_id][p.fecha_torneo_id] = {
        puntos: p.puntos_obtenidos,
        instancia: p.instancia_alcanzada,
      };
    }
    
    // Override with historial if exists
    for (const hp of puntosPorFecha) {
      if (!puntosMap[hp.jugador_id]) puntosMap[hp.jugador_id] = {};
      puntosMap[hp.jugador_id][hp.fecha_torneo_id] = {
        puntos: hp.puntos_acumulados,
        instancia: hp.motivo,
      };
    }

    return NextResponse.json({ 
      fechas,
      jugadores,
      puntosMap,
      mi_jugador_id: miJugadorId
    });
  } catch (error) {
    console.error("Error fetching ranking:", error);
    return NextResponse.json({ error: "Error al obtener ranking" }, { status: 500 });
  }
}
