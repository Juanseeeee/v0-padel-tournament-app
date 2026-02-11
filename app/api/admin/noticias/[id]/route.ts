import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await sql`SELECT * FROM informes WHERE id = ${id}`
    if (result.length === 0) {
      return NextResponse.json({ error: 'Informe not found' }, { status: 404 })
    }
    return NextResponse.json({ informe: result[0] })
  } catch (error) {
    console.error('Error fetching informe:', error)
    return NextResponse.json({ error: 'Error fetching informe' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { titulo, contenido, autor, imagen_url, destacado } = body

    const result = await sql`
      UPDATE informes 
      SET 
        titulo = ${titulo},
        contenido = ${contenido},
        autor = ${autor || null},
        imagen_url = ${imagen_url || null},
        destacado = ${destacado || false}
      WHERE id = ${id}
      RETURNING *
    `
    
    return NextResponse.json({ informe: result[0] })
  } catch (error) {
    console.error('Error updating informe:', error)
    return NextResponse.json({ error: 'Error updating informe' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await sql`DELETE FROM informes WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting informe:', error)
    return NextResponse.json({ error: 'Error deleting informe' }, { status: 500 })
  }
}
