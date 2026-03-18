import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: torneoId } = await params;
  
  try {
    const body = await request.json();
    const { publicado } = body;

    if (typeof publicado !== 'boolean') {
      return NextResponse.json({ error: "El campo 'publicado' es requerido y debe ser booleano" }, { status: 400 });
    }

    const result = await sql`
      UPDATE fechas_torneo
      SET publicado = ${publicado}
      WHERE id = ${parseInt(torneoId)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, torneo: result[0] });
  } catch (error) {
    console.error("Error al actualizar estado de publicación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
