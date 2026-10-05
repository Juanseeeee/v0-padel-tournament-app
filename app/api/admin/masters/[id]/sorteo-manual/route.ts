import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { iniciarSorteoManual } from "@/lib/masters";
import { NextResponse } from "next/server";

// POST /api/admin/masters/[id]/sorteo-manual
// Prepara la llave con 4 cajas vacías para hacer el sorteo EN VIVO (colocando
// las parejas a mano mientras se proyecta).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const masterId = Number(id);

  const parts = await sql`SELECT COUNT(*)::int AS n FROM master_participantes WHERE master_id = ${masterId}`;
  if ((parts[0]?.n || 0) < 2)
    return NextResponse.json({ error: "Se necesitan al menos 2 clasificados" }, { status: 400 });

  try {
    await iniciarSorteoManual(masterId);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
