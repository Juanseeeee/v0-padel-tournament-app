import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; parejaId: string }> }
) {
  const { parejaId } = await params;

  try {
    // Verificar que la pareja no esté en ninguna zona
    const enZona = await sql`
      SELECT * FROM parejas_zona WHERE pareja_id = ${parseInt(parejaId)}
    `;

    if (enZona.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una pareja que ya está asignada a una zona" },
        { status: 400 }
      );
    }

    await sql`DELETE FROM parejas_torneo WHERE id = ${parseInt(parejaId)}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pareja:", error);
    return NextResponse.json({ error: "Error al eliminar pareja" }, { status: 500 });
  }
}
