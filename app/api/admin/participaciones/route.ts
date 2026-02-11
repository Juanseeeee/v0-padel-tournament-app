import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaId = searchParams.get('fecha')
    const categoriaId = searchParams.get('categoria')

    if (!fechaId || !categoriaId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const participaciones = await sql`
      SELECT * FROM participaciones 
      WHERE fecha_torneo_id = ${fechaId} AND categoria_id = ${categoriaId}
      ORDER BY posicion ASC NULLS LAST
    `
    return NextResponse.json({ participaciones })
  } catch (error) {
    console.error('Error fetching participaciones:', error)
    return NextResponse.json({ error: 'Error fetching participaciones' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fecha_torneo_id, categoria_id, participaciones } = body

    // Delete existing participaciones for this fecha and categoria
    await sql`
      DELETE FROM participaciones 
      WHERE fecha_torneo_id = ${fecha_torneo_id} AND categoria_id = ${categoria_id}
    `

    // Delete existing historial_puntos
    await sql`
      DELETE FROM historial_puntos 
      WHERE fecha_torneo_id = ${fecha_torneo_id}
      AND jugador_id IN (
        SELECT id FROM jugadores WHERE categoria_id = ${categoria_id}
      )
    `

    // Insert new participaciones and update points
    for (const p of participaciones) {
      // Insert participacion
      await sql`
        INSERT INTO participaciones (fecha_torneo_id, jugador_id, categoria_id, posicion, puntos_obtenidos, pareja_id)
        VALUES (${fecha_torneo_id}, ${p.jugador_id}, ${categoria_id}, ${p.posicion}, ${p.puntos_obtenidos}, ${p.pareja_id})
      `

      // Insert historial
      if (p.puntos_obtenidos > 0) {
        await sql`
          INSERT INTO historial_puntos (jugador_id, fecha_torneo_id, puntos, descripcion)
          VALUES (${p.jugador_id}, ${fecha_torneo_id}, ${p.puntos_obtenidos}, ${`Posición ${p.posicion}`})
        `
      }

      // Update player total points
      await sql`
        UPDATE jugadores 
        SET puntos_totales = (
          SELECT COALESCE(SUM(puntos), 0) FROM historial_puntos WHERE jugador_id = ${p.jugador_id}
        )
        WHERE id = ${p.jugador_id}
      `

      // If there's a pareja, also add points for them
      if (p.pareja_id) {
        await sql`
          INSERT INTO participaciones (fecha_torneo_id, jugador_id, categoria_id, posicion, puntos_obtenidos, pareja_id)
          VALUES (${fecha_torneo_id}, ${p.pareja_id}, ${categoria_id}, ${p.posicion}, ${p.puntos_obtenidos}, ${p.jugador_id})
          ON CONFLICT DO NOTHING
        `

        if (p.puntos_obtenidos > 0) {
          await sql`
            INSERT INTO historial_puntos (jugador_id, fecha_torneo_id, puntos, descripcion)
            VALUES (${p.pareja_id}, ${fecha_torneo_id}, ${p.puntos_obtenidos}, ${`Posición ${p.posicion}`})
            ON CONFLICT DO NOTHING
          `
        }

        await sql`
          UPDATE jugadores 
          SET puntos_totales = (
            SELECT COALESCE(SUM(puntos), 0) FROM historial_puntos WHERE jugador_id = ${p.pareja_id}
          )
          WHERE id = ${p.pareja_id}
        `
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving participaciones:', error)
    return NextResponse.json({ error: 'Error saving participaciones' }, { status: 500 })
  }
}
