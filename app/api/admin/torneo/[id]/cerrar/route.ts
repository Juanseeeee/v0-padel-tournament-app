import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { recalcularPuntosTorneo } from "@/lib/torneo-points";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: torneoId } = await params;

  try {
    const [torneo] = await sql`
      SELECT ft.*, c.nombre as categoria_nombre
      FROM fechas_torneo ft
      LEFT JOIN categorias c ON c.id = ft.categoria_id
      WHERE ft.id = ${parseInt(torneoId)}
    `;

    if (!torneo) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    const categoriaId = torneo.categoria_id;
    if (!categoriaId) {
      return NextResponse.json({ error: "El torneo no tiene categoría" }, { status: 400 });
    }

    // Verificar que la final esté jugada
    const finalPendiente = await sql`
      SELECT id FROM llaves
      WHERE fecha_torneo_id = ${parseInt(torneoId)}
        AND categoria_id = ${categoriaId}
        AND ronda = 'final'
        AND estado != 'finalizado'
      LIMIT 1
    `;
    if (finalPendiente.length > 0) {
      return NextResponse.json({ error: "La final aún no se ha jugado" }, { status: 400 });
    }

    // Calcular participaciones y puntos a partir de los resultados actuales.
    const { procesados } = await recalcularPuntosTorneo(parseInt(torneoId));

    // Marcar torneo como finalizada
    await sql`UPDATE fechas_torneo SET estado = 'finalizada' WHERE id = ${parseInt(torneoId)}`;

    return NextResponse.json({
      success: true,
      message: `Torneo cerrado. Se asignaron puntos a ${procesados} jugadores en categoría ${torneo.categoria_nombre}.`,
    });
  } catch (error: any) {
    console.error("[v0] Error cerrando torneo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
