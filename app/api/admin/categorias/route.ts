import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const categorias = await sql`
      SELECT * FROM categorias ORDER BY orden_nivel ASC
    `
    
    // Get player count per category
    const jugadoresCount = await sql`
      SELECT categoria_actual_id, COUNT(*) as count 
      FROM jugadores 
      WHERE estado = 'activo' AND categoria_actual_id IS NOT NULL
      GROUP BY categoria_actual_id
    `
    
    const jugadoresPorCategoria: Record<number, number> = {}
    for (const row of jugadoresCount) {
      jugadoresPorCategoria[row.categoria_actual_id] = Number(row.count)
    }
    
    return NextResponse.json({ categorias, jugadoresPorCategoria })
  } catch (error) {
    console.error('Error fetching categorias:', error)
    return NextResponse.json({ error: 'Error fetching categorias' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, orden_nivel } = body

    const result = await sql`
      INSERT INTO categorias (nombre, orden_nivel)
      VALUES (${nombre}, ${orden_nivel})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating categoria:", error)
    return NextResponse.json({ error: "Error creating categoria" }, { status: 500 })
  }
}
