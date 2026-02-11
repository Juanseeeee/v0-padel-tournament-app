import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const fechas = await sql`
      SELECT 
        f.*,
        c.nombre as categoria_nombre
      FROM fechas_torneo f
      LEFT JOIN categorias c ON f.categoria_id = c.id
      ORDER BY f.temporada DESC, f.numero_fecha DESC
    `
    return NextResponse.json({ fechas })
  } catch (error) {
    console.error('Error fetching fechas:', error)
    return NextResponse.json({ error: 'Error fetching fechas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
      hora_inicio_sabado
    } = body

    if (!categoria_id) {
      return NextResponse.json({ error: 'categoria_id es requerido' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO fechas_torneo (
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
        hora_inicio_sabado
      )
      VALUES (
        ${numero_fecha}, 
        ${fecha_calendario || null}, 
        ${sede || null}, 
        ${direccion || null}, 
        ${estado || 'programada'}, 
        ${temporada},
        ${categoria_id},
        ${dias_torneo || 3},
        ${formato_zona || 3},
        ${duracion_partido_min || 60},
        ${hora_inicio_viernes || '18:00'},
        ${hora_inicio_sabado || '18:00'}
      )
      RETURNING *
    `
    
    return NextResponse.json({ id: result[0].id, fecha: result[0] })
  } catch (error) {
    console.error('Error creating fecha:', error)
    return NextResponse.json({ error: 'Error creating fecha' }, { status: 500 })
  }
}
