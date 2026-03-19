import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await sql`
      SELECT j.*, 
        COALESCE(pc.total_puntos, 0) as puntos_totales,
        pc.puntos_por_categoria,
        jc.cat_names as categorias_nombres,
        jc.cat_ids as categoria_ids,
        u.id as usuario_id,
        u.email as usuario_email,
        u.dni as usuario_dni,
        u.telefono as usuario_telefono
      FROM jugadores j
      LEFT JOIN (
        SELECT pc.jugador_id, SUM(pc.puntos_acumulados) as total_puntos,
               json_agg(json_build_object('categoria_id', pc.categoria_id, 'nombre', c.nombre, 'puntos', pc.puntos_acumulados)) as puntos_por_categoria
        FROM puntos_categoria pc
        JOIN jugador_categorias jc ON pc.jugador_id = jc.jugador_id AND pc.categoria_id = jc.categoria_id
        JOIN categorias c ON pc.categoria_id = c.id
        GROUP BY pc.jugador_id
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
      WHERE j.id = ${id}
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Jugador not found' }, { status: 404 })
    }
    return NextResponse.json({ jugador: result[0] })
  } catch (error) {
    console.error('Error fetching jugador:', error)
    return NextResponse.json({ error: 'Error fetching jugador' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { nombre, apellido, localidad, genero, categoria_actual_id, categoria_ids, estado, telefono } = body

    const result = await sql`
      UPDATE jugadores 
      SET 
        nombre = ${nombre},
        apellido = ${apellido},
        localidad = ${localidad || null},
        genero = ${genero || 'masculino'},
        categoria_actual_id = ${categoria_actual_id || null},
        estado = ${estado || 'activo'},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Jugador not found' }, { status: 404 })
    }

    // Update multi-category relations
    if (categoria_ids && Array.isArray(categoria_ids)) {
      await sql`DELETE FROM jugador_categorias WHERE jugador_id = ${id}`
      for (const catId of categoria_ids) {
        await sql`
          INSERT INTO jugador_categorias (jugador_id, categoria_id)
          VALUES (${id}, ${catId})
          ON CONFLICT DO NOTHING
        `
      }
    }
    
    // Update user's phone if exists and provided
    if (telefono !== undefined) {
      await sql`
        UPDATE usuarios
        SET telefono = ${telefono}
        WHERE jugador_id = ${id}
      `
    }
    
    return NextResponse.json({ jugador: result[0] })
  } catch (error) {
    console.error('Error updating jugador:', error)
    return NextResponse.json({ error: 'Error updating jugador' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const participaciones = await sql`
      SELECT COUNT(*) as count FROM participaciones WHERE jugador_id = ${id}
    `
    
    if (Number(participaciones[0]?.count) > 0) {
      await sql`UPDATE jugadores SET estado = 'inactivo' WHERE id = ${id}`
      await sql`DELETE FROM usuarios WHERE jugador_id = ${id}`
      return NextResponse.json({ success: true, message: 'Jugador marcado como inactivo' })
    }
    
    await sql`DELETE FROM jugador_categorias WHERE jugador_id = ${id}`
    await sql`DELETE FROM usuarios WHERE jugador_id = ${id}`
    await sql`DELETE FROM jugadores WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting jugador:', error)
    return NextResponse.json({ error: 'Error deleting jugador' }, { status: 500 })
  }
}
