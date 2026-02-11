import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const puntos = await sql`
      SELECT * FROM puntos_configuracion ORDER BY orden ASC
    `
    return NextResponse.json({ puntos })
  } catch (error) {
    console.error('Error fetching puntos:', error)
    return NextResponse.json({ error: 'Error fetching puntos' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { puntos } = body // Array of { instancia, puntos, orden }

    // Update each puntos config
    for (const p of puntos) {
      await sql`
        UPDATE puntos_configuracion 
        SET puntos = ${p.puntos}
        WHERE instancia = ${p.instancia}
      `
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating puntos:', error)
    return NextResponse.json({ error: 'Error updating puntos' }, { status: 500 })
  }
}
