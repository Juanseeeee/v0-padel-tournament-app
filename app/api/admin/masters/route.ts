import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/admin/masters?temporada=2026 — lista de masters (con categoría)
export async function GET(request: Request) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const temporada = searchParams.get("temporada");

  const masters = temporada
    ? await sql`
        SELECT m.*, c.nombre AS categoria_nombre, c.orden_nivel,
               (SELECT COUNT(*) FROM master_participantes mp WHERE mp.master_id = m.id) AS participantes_count
        FROM masters m JOIN categorias c ON c.id = m.categoria_id
        WHERE m.temporada = ${Number(temporada)}
        ORDER BY c.orden_nivel ASC`
    : await sql`
        SELECT m.*, c.nombre AS categoria_nombre, c.orden_nivel,
               (SELECT COUNT(*) FROM master_participantes mp WHERE mp.master_id = m.id) AS participantes_count
        FROM masters m JOIN categorias c ON c.id = m.categoria_id
        ORDER BY m.temporada DESC, c.orden_nivel ASC`;

  return NextResponse.json({ masters });
}
