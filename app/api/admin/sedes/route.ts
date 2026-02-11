import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const sedes = await sql`
      SELECT * FROM sedes 
      ORDER BY nombre ASC
    `
    return NextResponse.json(sedes)
  } catch (error) {
    console.error("Error fetching sedes:", error)
    return NextResponse.json({ error: "Error fetching sedes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, direccion, localidad, capacidad_canchas, telefono, activa } = body

    const result = await sql`
      INSERT INTO sedes (nombre, direccion, localidad, capacidad_canchas, telefono, activa)
      VALUES (${nombre}, ${direccion || null}, ${localidad || null}, ${capacidad_canchas}, ${telefono || null}, ${activa})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating sede:", error)
    return NextResponse.json({ error: "Error creating sede" }, { status: 500 })
  }
}
