import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const jugadores = await sql`
      SELECT j.*, 
        COALESCE(pc.total_puntos, 0) as puntos_totales,
        jc.cat_names as categorias_nombres,
        jc.cat_ids as categoria_ids,
        u.id as usuario_id,
        u.email as usuario_email,
        u.dni as usuario_dni,
        u.telefono as usuario_telefono
      FROM jugadores j
      LEFT JOIN (
        SELECT jugador_id, SUM(puntos_acumulados) as total_puntos
        FROM puntos_categoria
        GROUP BY jugador_id
      ) pc ON pc.jugador_id = j.id
      LEFT JOIN (
        SELECT jc2.jugador_id, 
          STRING_AGG(c.nombre, ', ' ORDER BY c.orden_nivel) as cat_names,
          STRING_AGG(c.id::text, ',' ORDER BY c.orden_nivel) as cat_ids
        FROM jugador_categorias jc2
        JOIN categorias c ON c.id = jc2.categoria_id
        GROUP BY jc2.jugador_id
      ) jc ON jc.jugador_id = j.id
      LEFT JOIN usuarios u ON u.jugador_id = j.id
      ORDER BY COALESCE(pc.total_puntos, 0) DESC, j.nombre ASC
    `
    return NextResponse.json({ jugadores })
  } catch (error) {
    console.error('Error fetching jugadores:', error)
    return NextResponse.json({ error: 'Error fetching jugadores' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, apellido, localidad, genero, categoria_actual_id, categoria_ids, estado, telefono } = body

    const result = await sql`
      INSERT INTO jugadores (nombre, apellido, localidad, genero, categoria_actual_id, estado, puntos_totales)
      VALUES (${nombre}, ${apellido}, ${localidad || null}, ${genero || 'masculino'}, ${categoria_actual_id || null}, ${estado || 'activo'}, 0)
      RETURNING *
    `

    const jugadorId = result[0].id

    // Insert multi-category relations
    if (categoria_ids && Array.isArray(categoria_ids)) {
      for (const catId of categoria_ids) {
        await sql`
          INSERT INTO jugador_categorias (jugador_id, categoria_id)
          VALUES (${jugadorId}, ${catId})
          ON CONFLICT DO NOTHING
        `
      }
    }
    
    // If phone provided but no user, nothing to update here (telefono vive en usuarios)
    
    return NextResponse.json({ jugador: result[0] })
  } catch (error) {
    console.error('Error creating jugador:', error)
    return NextResponse.json({ error: 'Error creating jugador' }, { status: 500 })
  }
}
