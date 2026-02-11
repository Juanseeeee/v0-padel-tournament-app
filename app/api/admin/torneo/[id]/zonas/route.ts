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
    let zonas;
    if (categoriaId && categoriaId !== "todas") {
      zonas = await sql`
        SELECT z.*, c.nombre as categoria_nombre
        FROM zonas z
        JOIN categorias c ON z.categoria_id = c.id
        WHERE z.fecha_torneo_id = ${parseInt(id)} AND z.categoria_id = ${parseInt(categoriaId)}
        ORDER BY z.nombre
      `;
    } else {
      zonas = await sql`
        SELECT z.*, c.nombre as categoria_nombre
        FROM zonas z
        JOIN categorias c ON z.categoria_id = c.id
        WHERE z.fecha_torneo_id = ${parseInt(id)}
        ORDER BY z.categoria_id, z.nombre
      `;
    }

    return NextResponse.json(zonas);
  } catch (error) {
    console.error("Error fetching zonas:", error);
    return NextResponse.json({ error: "Error al obtener zonas" }, { status: 500 });
  }
}
