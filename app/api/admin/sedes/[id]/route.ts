import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await sql`
      SELECT * FROM sedes WHERE id = ${id}
    `
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Sede not found" }, { status: 404 })
    }
    
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching sede:", error)
    return NextResponse.json({ error: "Error fetching sede" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, direccion, localidad, capacidad_canchas, telefono, activa } = body

    const result = await sql`
      UPDATE sedes 
      SET 
        nombre = ${nombre},
        direccion = ${direccion || null},
        localidad = ${localidad || null},
        capacidad_canchas = ${capacidad_canchas},
        telefono = ${telefono || null},
        activa = ${activa}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Sede not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating sede:", error)
    return NextResponse.json({ error: "Error updating sede" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const result = await sql`
      DELETE FROM sedes WHERE id = ${id} RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Sede not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sede:", error)
    return NextResponse.json({ error: "Error deleting sede" }, { status: 500 })
  }
}
