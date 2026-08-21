import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/admin/masters/[id]/llaves/reorder  { orden: [{ id, orden }] }
// Reordena los partidos (para acomodar horarios de los jugadores).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const masterId = Number(id);
  const { orden } = await request.json();

  if (!Array.isArray(orden))
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  for (const item of orden) {
    if (!item?.id) continue;
    await sql`
      UPDATE master_llaves SET orden = ${Number(item.orden) || 0}, updated_at = NOW()
      WHERE id = ${Number(item.id)} AND master_id = ${masterId}
    `;
  }

  return NextResponse.json({ success: true });
}
