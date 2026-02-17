import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id || id === 'undefined' || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Invalid fecha ID' }, { status: 400 })
  }
  
  try {
    const result = await sql`
      SELECT 
        f.*,
        c.nombre as categoria_nombre
      FROM fechas_torneo f
      LEFT JOIN categorias c ON f.categoria_id = c.id
      WHERE f.id = ${id}
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Fecha not found' }, { status: 404 })
    }
    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error fetching fecha:', error)
    return NextResponse.json({ error: 'Error fetching fecha' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { 
      numero_fecha, 
      fecha_calendario, 
      sede, 
      direccion, 
      estado, 
      temporada,
      categoria_id,
      dias_torneo,
      formato_zona,
      duracion_partido_min,
      hora_inicio_viernes,
      hora_inicio_sabado,
      modalidad,
      dias_juego
    } = body

    const result = await sql`
      UPDATE fechas_torneo 
      SET 
        numero_fecha = ${numero_fecha},
        fecha_calendario = ${fecha_calendario},
        sede = ${sede},
        direccion = ${direccion || null},
        estado = ${estado},
        temporada = ${temporada},
        categoria_id = ${categoria_id},
        dias_torneo = ${dias_torneo || 3},
        formato_zona = ${formato_zona || 3},
        duracion_partido_min = ${duracion_partido_min || 60},
        hora_inicio_viernes = ${hora_inicio_viernes || '18:00'},
        hora_inicio_sabado = ${hora_inicio_sabado || '18:00'},
        modalidad = ${modalidad || 'normal_3_sets_6'},
        dias_juego = ${dias_juego || 'viernes,sabado,domingo'}
      WHERE id = ${id}
      RETURNING *
    `
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Fecha not found' }, { status: 404 })
    }
    
    return NextResponse.json({ fecha: result[0] })
  } catch (error) {
    console.error('Error updating fecha:', error)
    return NextResponse.json({ error: 'Error updating fecha' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Delete related data first
    await sql`DELETE FROM participaciones WHERE fecha_torneo_id = ${id}`
    await sql`DELETE FROM historial_puntos WHERE fecha_torneo_id = ${id}`
    await sql`DELETE FROM fechas_torneo WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fecha:', error)
    return NextResponse.json({ error: 'Error deleting fecha' }, { status: 500 })
  }
}
