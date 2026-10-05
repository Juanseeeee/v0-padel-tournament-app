import { requireAuth } from "@/lib/auth";
import { asignarJugadorPareja } from "@/lib/masters";
import { NextResponse } from "next/server";

// POST /api/admin/masters/[id]/asignar  { jugador_id, pareja_numero }
// Coloca (o quita, con pareja_numero null) un jugador en una caja del sorteo en vivo.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { jugador_id, pareja_numero } = await request.json();
  if (!jugador_id) return NextResponse.json({ error: "Falta jugador_id" }, { status: 400 });

  try {
    await asignarJugadorPareja(Number(id), Number(jugador_id), pareja_numero == null ? null : Number(pareja_numero));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
