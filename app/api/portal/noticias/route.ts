import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const informes = await sql`
      SELECT * FROM informes
      WHERE publicado = true AND fijado = true
      ORDER BY fecha_publicacion DESC
      LIMIT 3
    `
    return NextResponse.json({ informes })
  } catch (error) {
    console.error('Error fetching noticias portal:', error)
    return NextResponse.json({ error: 'Error fetching noticias' }, { status: 500 })
  }
}