import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET - Obtener detalle de una zona con sus partidos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zonaId: string }> }
) {
  const { zonaId } = await params;

  try {
    // Obtener zona
    const [zona] = await sql`
      SELECT z.*, c.nombre as categoria_nombre
      FROM zonas z
      LEFT JOIN categorias c ON c.id = z.categoria_id
      WHERE z.id = ${parseInt(zonaId)}
    `;

    if (!zona) {
      return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
    }

    // Obtener parejas de la zona con datos de jugadores
    const parejas = await sql`
      SELECT 
        pz.id as pareja_zona_id,
        pz.posicion_final,
        pz.partidos_ganados,
        pz.partidos_perdidos,
        pz.sets_ganados,
        pz.sets_perdidos,
        pz.games_ganados,
        pz.games_perdidos,
        pt.id as pareja_torneo_id,
        pt.cabeza_serie,
        j1.nombre as j1_nombre, j1.apellido as j1_apellido,
        j2.nombre as j2_nombre, j2.apellido as j2_apellido
      FROM parejas_zona pz
      JOIN parejas_torneo pt ON pt.id = pz.pareja_id
      JOIN jugadores j1 ON j1.id = pt.jugador1_id
      JOIN jugadores j2 ON j2.id = pt.jugador2_id
      WHERE pz.zona_id = ${parseInt(zonaId)}
      ORDER BY pz.partidos_ganados DESC, (pz.sets_ganados - pz.sets_perdidos) DESC, pz.posicion_final
    `;

    // Obtener partidos de la zona
    const partidos = await sql`
      SELECT 
        p.*,
        j1_1.nombre as p1_j1_nombre, j1_1.apellido as p1_j1_apellido,
        j1_2.nombre as p1_j2_nombre, j1_2.apellido as p1_j2_apellido,
        j2_1.nombre as p2_j1_nombre, j2_1.apellido as p2_j1_apellido,
        j2_2.nombre as p2_j2_nombre, j2_2.apellido as p2_j2_apellido
      FROM partidos_zona p
      LEFT JOIN parejas_torneo pt1 ON pt1.id = p.pareja1_id
      LEFT JOIN jugadores j1_1 ON j1_1.id = pt1.jugador1_id
      LEFT JOIN jugadores j1_2 ON j1_2.id = pt1.jugador2_id
      LEFT JOIN parejas_torneo pt2 ON pt2.id = p.pareja2_id
      LEFT JOIN jugadores j2_1 ON j2_1.id = pt2.jugador1_id
      LEFT JOIN jugadores j2_2 ON j2_2.id = pt2.jugador2_id
      WHERE p.zona_id = ${parseInt(zonaId)}
      ORDER BY p.orden_partido
    `;

    return NextResponse.json({
      zona,
      parejas,
      partidos,
    });
  } catch (error) {
    console.error("Error fetching zona:", error);
    return NextResponse.json(
      { error: "Error al obtener zona", details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - Cerrar zona y calcular posiciones finales
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zonaId: string }> }
) {
  const { zonaId } = await params;
  const body = await request.json();
  const { estado } = body;

  try {
    // Si se está cerrando la zona, calcular posiciones finales
    if (estado === 'finalizada') {
      // Obtener parejas ordenadas por partidos ganados y diferencia de sets
      const parejas = await sql`
        SELECT pareja_id, partidos_ganados, sets_ganados, sets_perdidos
        FROM parejas_zona
        WHERE zona_id = ${parseInt(zonaId)}
        ORDER BY partidos_ganados DESC, (sets_ganados - sets_perdidos) DESC, sets_ganados DESC
      `;

      // Actualizar posiciones finales
      for (let i = 0; i < parejas.length; i++) {
        await sql`
          UPDATE parejas_zona 
          SET posicion_final = ${i + 1}
          WHERE zona_id = ${parseInt(zonaId)} AND pareja_id = ${parejas[i].pareja_id}
        `;
      }
    }

    // Actualizar estado de la zona
    await sql`
      UPDATE zonas SET estado = ${estado} WHERE id = ${parseInt(zonaId)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating zona:", error);
    return NextResponse.json(
      { error: "Error al actualizar zona", details: String(error) },
      { status: 500 }
    );
  }
}
