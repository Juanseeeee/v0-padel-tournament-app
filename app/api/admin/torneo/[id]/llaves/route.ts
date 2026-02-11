import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const categoriaId = searchParams.get("categoria");

  try {
    let llaves;
    if (categoriaId && categoriaId !== "todas") {
      llaves = await sql`
        SELECT 
          l.*,
          pt1.numero_pareja as pareja1_numero,
          pt2.numero_pareja as pareja2_numero,
          CONCAT(j1a.nombre, ' ', LEFT(j1a.apellido, 1), '. / ', j1b.nombre, ' ', LEFT(j1b.apellido, 1), '.') as pareja1_jugadores,
          CONCAT(j2a.nombre, ' ', LEFT(j2a.apellido, 1), '. / ', j2b.nombre, ' ', LEFT(j2b.apellido, 1), '.') as pareja2_jugadores
        FROM llaves l
        LEFT JOIN parejas_torneo pt1 ON l.pareja1_id = pt1.id
        LEFT JOIN parejas_torneo pt2 ON l.pareja2_id = pt2.id
        LEFT JOIN jugadores j1a ON pt1.jugador1_id = j1a.id
        LEFT JOIN jugadores j1b ON pt1.jugador2_id = j1b.id
        LEFT JOIN jugadores j2a ON pt2.jugador1_id = j2a.id
        LEFT JOIN jugadores j2b ON pt2.jugador2_id = j2b.id
        WHERE l.fecha_torneo_id = ${parseInt(id)} AND l.categoria_id = ${parseInt(categoriaId)}
        ORDER BY 
          CASE l.ronda 
            WHEN '16avos' THEN 1 
            WHEN '8vos' THEN 2 
            WHEN '4tos' THEN 3 
            WHEN 'semis' THEN 4 
            WHEN 'final' THEN 5 
          END,
          l.posicion
      `;
    } else {
      llaves = await sql`
        SELECT l.* FROM llaves l
        WHERE l.fecha_torneo_id = ${parseInt(id)}
        ORDER BY l.categoria_id, l.ronda, l.posicion
      `;
    }

    return NextResponse.json(llaves);
  } catch (error) {
    console.error("Error fetching llaves:", error);
    return NextResponse.json({ error: "Error al obtener llaves" }, { status: 500 });
  }
}
