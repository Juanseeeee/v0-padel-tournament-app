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
    // 1. Get info before deleting
    // We need to know which players need their total points recalculated
    const historialResult = await sql`
      SELECT DISTINCT jugador_id FROM historial_puntos WHERE fecha_torneo_id = ${id}
    `
    const affectedPlayerIds = historialResult.map(row => row.jugador_id)
    
    // Get tournament info to know the category
    const torneoResult = await sql`
      SELECT categoria_id FROM fechas_torneo WHERE id = ${id}
    `
    const categoriaId = torneoResult.length > 0 ? torneoResult[0].categoria_id : null;

    // 2. Delete related data in correct order to respect Foreign Key constraints
    
    // Partidos de zona (depends on zonas)
    await sql`
      DELETE FROM partidos_zona 
      WHERE zona_id IN (SELECT id FROM zonas WHERE fecha_torneo_id = ${id})
    `
    
    // Parejas de zona (depends on zonas)
    await sql`
      DELETE FROM parejas_zona 
      WHERE zona_id IN (SELECT id FROM zonas WHERE fecha_torneo_id = ${id})
    `
    
    // Zonas (depends on fechas_torneo)
    await sql`DELETE FROM zonas WHERE fecha_torneo_id = ${id}`
    
    // Llaves (depends on fechas_torneo)
    await sql`DELETE FROM llaves WHERE fecha_torneo_id = ${id}`
    
    // Participaciones (depends on fechas_torneo)
    await sql`DELETE FROM participaciones WHERE fecha_torneo_id = ${id}`
    
    // Historial Puntos (depends on fechas_torneo)
    await sql`DELETE FROM historial_puntos WHERE fecha_torneo_id = ${id}`
    
    // Parejas Torneo (Inscripciones) (depends on fechas_torneo)
    await sql`DELETE FROM parejas_torneo WHERE fecha_torneo_id = ${id}`
    
    // Finally delete the tournament date
    await sql`DELETE FROM fechas_torneo WHERE id = ${id}`

    // 3. Recalculate points for affected players
    if (affectedPlayerIds.length > 0) {
      // Use standard SQL for array handling if driver supports it, or loop if safer.
      // Neon/Postgres: = ANY($1) works with arrays.
      
      // We update points_totales for each affected player by summing their remaining history
      await sql`
        UPDATE jugadores j
        SET puntos_totales = (
          SELECT COALESCE(SUM(hp.puntos_acumulados), 0)
          FROM historial_puntos hp
          WHERE hp.jugador_id = j.id
        )
        WHERE j.id = ANY(${affectedPlayerIds})
      `
      
      // Recalculate puntos_categoria for affected players in the tournament category
      if (categoriaId) {
        // For each affected player, update their entry in puntos_categoria for this category
        await sql`
          UPDATE puntos_categoria pc
          SET 
            puntos_acumulados = (
              SELECT COALESCE(SUM(hp.puntos_acumulados), 0)
              FROM historial_puntos hp
              WHERE hp.jugador_id = pc.jugador_id AND hp.categoria_id = ${categoriaId}
            ),
            torneos_jugados = (
              SELECT COUNT(DISTINCT hp.fecha_torneo_id)
              FROM historial_puntos hp
              WHERE hp.jugador_id = pc.jugador_id AND hp.categoria_id = ${categoriaId}
            )
          WHERE pc.categoria_id = ${categoriaId} AND pc.jugador_id = ANY(${affectedPlayerIds})
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fecha:', error)
    return NextResponse.json({ error: 'Error deleting fecha' }, { status: 500 })
  }
}
