import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = (searchParams.get("nombre") || "").trim().toUpperCase()
    const apellido = (searchParams.get("apellido") || "").trim().toUpperCase()
    if (!nombre || !apellido) {
      return NextResponse.json({ jugadores: [] })
    }
    const jugadores = await sql`
      SELECT 
        j.id, 
        j.nombre, 
        j.apellido, 
        j.localidad,
        COALESCE(
          STRING_AGG(c.id::text, ',' ORDER BY c.orden_nivel),
          ''
        ) AS categoria_ids,
        COALESCE(
          STRING_AGG(c.nombre, ', ' ORDER BY c.orden_nivel),
          ''
        ) AS categorias_nombres
      FROM jugadores j
      LEFT JOIN usuarios u ON u.jugador_id = j.id
      LEFT JOIN jugador_categorias jc ON jc.jugador_id = j.id
      LEFT JOIN categorias c ON c.id = jc.categoria_id
      WHERE UPPER(j.nombre) = ${nombre}
        AND UPPER(j.apellido) = ${apellido}
        AND u.id IS NULL
      GROUP BY j.id
      ORDER BY j.created_at ASC
      LIMIT 5
    `
    return NextResponse.json({ jugadores })
  } catch (error) {
    return NextResponse.json({ jugadores: [] })
  }
}
