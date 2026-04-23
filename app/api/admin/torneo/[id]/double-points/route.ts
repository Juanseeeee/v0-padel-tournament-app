import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: torneoId } = await params;
  
  try {
    const body = await request.json();
    const { is_double_points } = body;

    if (typeof is_double_points !== 'boolean') {
      return NextResponse.json({ error: "El campo 'is_double_points' es requerido y debe ser booleano" }, { status: 400 });
    }

    const result = await sql`
      UPDATE fechas_torneo
      SET is_double_points = ${is_double_points}
      WHERE id = ${parseInt(torneoId)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, torneo: result[0] });
  } catch (error) {
    console.error("Error al actualizar estado de puntos dobles:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
