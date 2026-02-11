import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoriaId = searchParams.get('categoria_id')

  if (!categoriaId) {
    return NextResponse.json({ error: 'categoria_id requerido' }, { status: 400 })
  }

  try {
    // Get all fechas (torneos) for this category
    const fechas = await sql`
      SELECT id, numero_fecha, fecha_calendario, estado
      FROM fechas_torneo
      WHERE categoria_id = ${categoriaId}
      ORDER BY numero_fecha ASC
    `

    // Get all jugadores in this category with their total points
    const jugadores = await sql`
      SELECT j.id, j.nombre, j.apellido, j.localidad,
        COALESCE(pc.puntos_acumulados, 0) as puntos_totales,
        COALESCE(pc.torneos_jugados, 0) as torneos_jugados,
        pc.mejor_resultado
      FROM jugador_categorias jc
      JOIN jugadores j ON j.id = jc.jugador_id
      LEFT JOIN puntos_categoria pc ON pc.jugador_id = j.id AND pc.categoria_id = ${categoriaId}
      WHERE jc.categoria_id = ${categoriaId}
        AND j.estado = 'activo'
      ORDER BY COALESCE(pc.puntos_acumulados, 0) DESC, j.nombre ASC
    `

    // Get points per fecha for each jugador
    const puntosPorFecha = await sql`
      SELECT hp.jugador_id, hp.fecha_torneo_id, hp.puntos_acumulados, hp.motivo
      FROM historial_puntos hp
      WHERE hp.categoria_id = ${categoriaId}
    `

    // Also check participaciones as fallback
    const participaciones = await sql`
      SELECT p.jugador_id, p.fecha_torneo_id, p.puntos_obtenidos, p.instancia_alcanzada
      FROM participaciones p
      WHERE p.categoria_id = ${categoriaId}
    `

    // Build a lookup: jugador_id -> { fecha_torneo_id -> puntos }
    const puntosMap: Record<number, Record<number, { puntos: number; instancia: string }>> = {}
    
    // First from participaciones (primary source)
    for (const p of participaciones) {
      if (!puntosMap[p.jugador_id]) puntosMap[p.jugador_id] = {}
      puntosMap[p.jugador_id][p.fecha_torneo_id] = {
        puntos: p.puntos_obtenidos,
        instancia: p.instancia_alcanzada,
      }
    }
    
    // Override with historial if exists
    for (const hp of puntosPorFecha) {
      if (!puntosMap[hp.jugador_id]) puntosMap[hp.jugador_id] = {}
      puntosMap[hp.jugador_id][hp.fecha_torneo_id] = {
        puntos: hp.puntos_acumulados,
        instancia: hp.motivo,
      }
    }

    return NextResponse.json({ fechas, jugadores, puntosMap })
  } catch (error) {
    console.error('Error fetching ranking:', error)
    return NextResponse.json({ error: 'Error fetching ranking' }, { status: 500 })
  }
}
