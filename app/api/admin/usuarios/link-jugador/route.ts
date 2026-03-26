import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const session = await requireAuth("admin")
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { email, localidad, jugador_id } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "email requerido" }, { status: 400 })
    }

    const usuario = await sql`
      SELECT id, jugador_id, nombre, apellido, email
      FROM usuarios
      WHERE email = ${String(email).toLowerCase().trim()}
    `
    if (usuario.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }
    const u = usuario[0]

    let targetJugadorId: number | null = null
    if (jugador_id) {
      const jres = await sql`SELECT id FROM jugadores WHERE id = ${parseInt(jugador_id)}`
      if (jres.length === 0) {
        return NextResponse.json({ error: "Jugador especificado no existe" }, { status: 404 })
      }
      targetJugadorId = jres[0].id
    } else {
      if (!localidad) {
        return NextResponse.json({ error: "localidad requerida si no se especifica jugador_id" }, { status: 400 })
      }
      const candidatos = await sql`
        SELECT j.id, j.nombre, j.apellido, j.localidad, j.estado, j.created_at
        FROM jugadores j
        WHERE UPPER(j.nombre) = ${String(u.nombre || "").toUpperCase().trim()}
          AND UPPER(j.apellido) = ${String(u.apellido || "").toUpperCase().trim()}
          AND j.localidad ILIKE ${`%${localidad}%`}
        ORDER BY j.estado DESC, j.created_at ASC
      `
      if (candidatos.length === 0) {
        return NextResponse.json({ error: "No se encontró jugador con ese nombre/apellido en la localidad indicada" }, { status: 404 })
      }
      targetJugadorId = candidatos[0].id
    }

    const jugador = await sql`SELECT id, nombre, apellido, localidad FROM jugadores WHERE id = ${targetJugadorId}`

    await sql`
      UPDATE usuarios
      SET jugador_id = ${targetJugadorId}
      WHERE id = ${u.id}
    `

    return NextResponse.json({
      success: true,
      usuario_id: u.id,
      email: u.email,
      vinculado_a_jugador: {
        id: jugador[0].id,
        nombre: jugador[0].nombre,
        apellido: jugador[0].apellido,
        localidad: jugador[0].localidad,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 })
  }
}
