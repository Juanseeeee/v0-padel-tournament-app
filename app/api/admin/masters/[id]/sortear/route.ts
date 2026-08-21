import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sortearMaster } from "@/lib/masters";
import { NextResponse } from "next/server";

// POST /api/admin/masters/[id]/sortear — sortea parejas y arma la llave.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const masterId = Number(id);

  const master = await sql`SELECT id, estado FROM masters WHERE id = ${masterId}`;
  if (master.length === 0) return NextResponse.json({ error: "Master no encontrado" }, { status: 404 });
  if (master[0].estado === "finalizado")
    return NextResponse.json({ error: "El Master está finalizado" }, { status: 400 });

  const parts = await sql`SELECT COUNT(*)::int AS n FROM master_participantes WHERE master_id = ${masterId}`;
  if ((parts[0]?.n || 0) < 2)
    return NextResponse.json({ error: "Se necesitan al menos 2 clasificados para sortear" }, { status: 400 });

  await sortearMaster(masterId);
  return NextResponse.json({ success: true });
}
