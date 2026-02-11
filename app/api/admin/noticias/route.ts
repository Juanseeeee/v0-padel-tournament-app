import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const informes = await sql`
      SELECT * FROM informes ORDER BY fecha_publicacion DESC
    `
    return NextResponse.json({ informes })
  } catch (error) {
    console.error('Error fetching informes:', error)
    return NextResponse.json({ error: 'Error fetching informes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { titulo, contenido, autor, imagen_url, destacado } = body

    const result = await sql`
      INSERT INTO informes (titulo, contenido, autor, imagen_url, destacado)
      VALUES (${titulo}, ${contenido}, ${autor || null}, ${imagen_url || null}, ${destacado || false})
      RETURNING *
    `
    
    return NextResponse.json({ informe: result[0] })
  } catch (error) {
    console.error('Error creating informe:', error)
    return NextResponse.json({ error: 'Error creating informe' }, { status: 500 })
  }
}
