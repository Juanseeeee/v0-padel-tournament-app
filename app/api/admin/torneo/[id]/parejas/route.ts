import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === 'undefined' || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Invalid torneo ID' }, { status: 400 });
  }

  try {
    const parejas = await sql`
      SELECT 
        pt.*,
        j1.nombre as jugador1_nombre,
        j1.apellido as jugador1_apellido,
        j2.nombre as jugador2_nombre,
        j2.apellido as jugador2_apellido,
        c.nombre as categoria_nombre
      FROM parejas_torneo pt
      JOIN jugadores j1 ON pt.jugador1_id = j1.id
      JOIN jugadores j2 ON pt.jugador2_id = j2.id
      JOIN categorias c ON pt.categoria_id = c.id
      WHERE pt.fecha_torneo_id = ${parseInt(id)}
      ORDER BY pt.categoria_id, pt.cabeza_serie DESC, pt.numero_pareja
    `;

    return NextResponse.json(parejas);
  } catch (error) {
    console.error("Error fetching parejas:", error);
    return NextResponse.json({ error: "Error al obtener parejas" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { jugador1_id, jugador2_id, categoria_id, cabeza_serie, dia_preferido, hora_disponible } = body;

  try {
    // Verificar que los jugadores no estén ya en otra pareja de este torneo
    const existingParejas = await sql`
      SELECT * FROM parejas_torneo 
      WHERE fecha_torneo_id = ${parseInt(id)}
      AND (jugador1_id = ${jugador1_id} OR jugador2_id = ${jugador1_id}
           OR jugador1_id = ${jugador2_id} OR jugador2_id = ${jugador2_id})
    `;

    if (existingParejas.length > 0) {
      return NextResponse.json(
        { error: "Uno o ambos jugadores ya están inscriptos en este torneo" },
        { status: 400 }
      );
    }

    // Obtener el siguiente número de pareja para esta categoría
    const maxNumero = await sql`
      SELECT COALESCE(MAX(numero_pareja), 0) as max_num 
      FROM parejas_torneo 
      WHERE fecha_torneo_id = ${parseInt(id)} AND categoria_id = ${categoria_id}
    `;
    const numero_pareja = (maxNumero[0]?.max_num || 0) + 1;

    const result = await sql`
      INSERT INTO parejas_torneo (fecha_torneo_id, jugador1_id, jugador2_id, categoria_id, numero_pareja, cabeza_serie, dia_preferido, hora_disponible)
      VALUES (${parseInt(id)}, ${jugador1_id}, ${jugador2_id}, ${categoria_id}, ${numero_pareja}, ${cabeza_serie || false}, ${dia_preferido || null}, ${hora_disponible || null})
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error creating pareja:", error);
    return NextResponse.json({ error: "Error al crear pareja" }, { status: 500 });
  }
}
