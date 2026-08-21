import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getCategoriaAptitud } from "@/lib/masters";
import { NextResponse } from "next/server";

// GET /api/admin/masters/[id]/candidatos
// Jugadores de la categoría que NO son clasificados, ordenados por aptitud
// (puntos > jugó 2 de últimas 3 > jugó ≥60% fechas).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const masterId = Number(id);

  const m = await sql`SELECT categoria_id FROM masters WHERE id = ${masterId}`;
  if (m.length === 0) return NextResponse.json({ error: "Master no encontrado" }, { status: 404 });

  const participantes = await sql`SELECT jugador_id FROM master_participantes WHERE master_id = ${masterId}`;
  const yaClasificado = new Set(participantes.map((p: any) => p.jugador_id));

  const candidatos = (await getCategoriaAptitud(m[0].categoria_id))
    .filter((c) => !yaClasificado.has(c.id))
    .sort((a, b) =>
      b.puntos - a.puntos ||
      Number(b.jugo_2_de_ultimas_3) - Number(a.jugo_2_de_ultimas_3) ||
      Number(b.jugo_60pct) - Number(a.jugo_60pct) ||
      `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es")
    )
    .slice(0, 40);

  return NextResponse.json({ candidatos });
}
