import { getMasterDetail } from "@/lib/masters";
import { NextResponse } from "next/server";

// GET /api/masters/[id] — detalle público (sólo masters publicados).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getMasterDetail(Number(id));
  if (!detail || !detail.master.publicado)
    return NextResponse.json({ error: "Master no disponible" }, { status: 404 });
  return NextResponse.json(detail);
}
