import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const categoriaId = searchParams.get("categoria");

  if (!categoriaId) {
    return NextResponse.json({ error: "Categoría requerida" }, { status: 400 });
  }

  try {
    const config = await sql`
      SELECT * FROM config_torneo 
      WHERE fecha_torneo_id = ${parseInt(id)} AND categoria_id = ${parseInt(categoriaId)}
    `;

    if (config.length === 0) {
      // Retornar configuración por defecto
      return NextResponse.json({
        dias_torneo: 3,
        duracion_partido_min: 60,
        formato_zona: 3,
        ronda_inicial: "8vos",
      });
    }

    return NextResponse.json(config[0]);
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { categoria_id, dias_torneo, formato_zona, duracion_partido_min } = body;

  try {
    // Upsert
    const existing = await sql`
      SELECT * FROM config_torneo 
      WHERE fecha_torneo_id = ${parseInt(id)} AND categoria_id = ${categoria_id}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE config_torneo 
        SET dias_torneo = ${dias_torneo}, formato_zona = ${formato_zona}, duracion_partido_min = ${duracion_partido_min}
        WHERE fecha_torneo_id = ${parseInt(id)} AND categoria_id = ${categoria_id}
      `;
    } else {
      await sql`
        INSERT INTO config_torneo (fecha_torneo_id, categoria_id, dias_torneo, formato_zona, duracion_partido_min)
        VALUES (${parseInt(id)}, ${categoria_id}, ${dias_torneo}, ${formato_zona}, ${duracion_partido_min})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
