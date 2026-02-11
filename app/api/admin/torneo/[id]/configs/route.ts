import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Obtener todas las configuraciones de un torneo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const configs = await sql`
      SELECT ct.*, c.nombre as categoria_nombre
      FROM config_torneo ct
      JOIN categorias c ON ct.categoria_id = c.id
      WHERE ct.fecha_torneo_id = ${parseInt(id)}
      ORDER BY c.orden_nivel
    `;

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching configs:", error);
    return NextResponse.json({ error: "Error al obtener configuraciones" }, { status: 500 });
  }
}
