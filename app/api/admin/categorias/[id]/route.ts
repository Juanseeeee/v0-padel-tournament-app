import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await sql`
      SELECT * FROM categorias WHERE id = ${id}
    `
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Categoria not found" }, { status: 404 })
    }
    
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching categoria:", error)
    return NextResponse.json({ error: "Error fetching categoria" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, orden_nivel } = body

    const result = await sql`
      UPDATE categorias 
      SET nombre = ${nombre}, orden_nivel = ${orden_nivel}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Categoria not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating categoria:", error)
    return NextResponse.json({ error: "Error updating categoria" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if category has players
    const playersCheck = await sql`
      SELECT COUNT(*) as count FROM jugadores WHERE categoria_actual_id = ${id}
    `
    
    if (Number(playersCheck[0]?.count) > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una categoría con jugadores asignados" }, 
        { status: 400 }
      )
    }
    
    const result = await sql`
      DELETE FROM categorias WHERE id = ${id} RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Categoria not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting categoria:", error)
    return NextResponse.json({ error: "Error deleting categoria" }, { status: 500 })
  }
}
