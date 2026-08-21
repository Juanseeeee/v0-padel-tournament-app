import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getMasterDetail, getCategoriaAptitud, reconcileParticipantes } from "@/lib/masters";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const masterId = Number(id);

  // Mantiene los clasificados al día con los resultados (sólo en 'borrador').
  await reconcileParticipantes(masterId);

  const detail = await getMasterDetail(masterId);
  if (!detail) return NextResponse.json({ error: "Master no encontrado" }, { status: 404 });

  // Ranking completo de la categoría, anotado con clasificado / recomendado.
  const ranking = await getCategoriaAptitud(detail.master.categoria_id);
  const clasificadoIds = new Map<number, any>(detail.participantes.map((p: any) => [p.jugador_id, p]));
  let recomendadosRestantes = 8;
  const ranking_categoria = ranking.map((r) => {
    const clasificado = clasificadoIds.has(r.id);
    const recomendado = !clasificado && r.puntos > 0 && recomendadosRestantes > 0;
    if (recomendado) recomendadosRestantes--;
    const info = clasificadoIds.get(r.id);
    return {
      ...r,
      clasificado,
      recomendado,
      seed: info?.seed ?? null,
      es_reemplazo: info?.es_reemplazo ?? false,
    };
  });

  return NextResponse.json({ ...detail, ranking_categoria });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const current = await sql`SELECT * FROM masters WHERE id = ${Number(id)}`;
  if (current.length === 0) return NextResponse.json({ error: "Master no encontrado" }, { status: 404 });
  const m = current[0];

  // Sólo se sobrescriben los campos presentes en el body (undefined => se mantiene)
  const pick = (key: string, val: any) => (val === undefined ? m[key] : val);

  await sql`
    UPDATE masters SET
      nombre = ${pick("nombre", body.nombre)},
      fecha_evento = ${pick("fecha_evento", body.fecha_evento)},
      dias_juego = ${pick("dias_juego", body.dias_juego)},
      hora_inicio = ${pick("hora_inicio", body.hora_inicio)},
      estado = ${pick("estado", body.estado)},
      publicado = ${pick("publicado", body.publicado)},
      updated_at = NOW()
    WHERE id = ${Number(id)}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await sql`DELETE FROM masters WHERE id = ${Number(id)}`;
  return NextResponse.json({ success: true });
}
