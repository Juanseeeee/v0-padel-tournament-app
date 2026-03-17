
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const categoriaId = searchParams.get("categoria");

  // Validación básica
  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ error: "Invalid torneo ID" }, { status: 400 });
  }

  try {
    let llaves;
    if (categoriaId && categoriaId !== "todas") {
      const catId = parseInt(categoriaId);
      if (isNaN(catId)) {
        return NextResponse.json({ error: "Invalid categoria ID" }, { status: 400 });
      }

      llaves = await sql`
        SELECT 
          l.*,
          pt1.numero_pareja as pareja1_numero,
          pt2.numero_pareja as pareja2_numero,
          CONCAT(j1a.nombre, ' ', LEFT(j1a.apellido, 1), '. / ', j1b.nombre, ' ', LEFT(j1b.apellido, 1), '.') as pareja1_jugadores,
          CONCAT(j2a.nombre, ' ', LEFT(j2a.apellido, 1), '. / ', j2b.nombre, ' ', LEFT(j2b.apellido, 1), '.') as pareja2_jugadores,
          l.siguiente_llave_id,
          l.siguiente_llave_slot
        FROM llaves l
        LEFT JOIN parejas_torneo pt1 ON l.pareja1_id = pt1.id
        LEFT JOIN parejas_torneo pt2 ON l.pareja2_id = pt2.id
        LEFT JOIN jugadores j1a ON pt1.jugador1_id = j1a.id
        LEFT JOIN jugadores j1b ON pt1.jugador2_id = j1b.id
        LEFT JOIN jugadores j2a ON pt2.jugador1_id = j2a.id
        LEFT JOIN jugadores j2b ON pt2.jugador2_id = j2b.id
        WHERE l.fecha_torneo_id = ${parseInt(id)} AND l.categoria_id = ${catId}
        ORDER BY 
          CASE l.ronda 
            WHEN '16avos' THEN 1 
            WHEN '8vos' THEN 2 
            WHEN '4tos' THEN 3 
            WHEN 'semis' THEN 4 
            WHEN 'final' THEN 5 
            ELSE 6
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
  } catch (error: any) {
    console.error("Error fetching llaves:", error);
    return NextResponse.json({ error: "Error al obtener llaves", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const categoriaId = searchParams.get("categoria");

  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ error: "Invalid torneo ID" }, { status: 400 });
  }

  try {
    if (categoriaId) {
       await sql`
        DELETE FROM llaves 
        WHERE fecha_torneo_id = ${parseInt(id)} AND categoria_id = ${parseInt(categoriaId)}
      `;
    } else {
      await sql`
        DELETE FROM llaves 
        WHERE fecha_torneo_id = ${parseInt(id)}
      `;
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting llaves:", error);
    return NextResponse.json({ error: "Error al eliminar llaves" }, { status: 500 });
  }
}
