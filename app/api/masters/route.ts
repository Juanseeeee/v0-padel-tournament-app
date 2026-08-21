import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/masters?temporada=2026 — masters publicados (para la vista pública).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const temporada = searchParams.get("temporada");

  const masters = temporada
    ? await sql`
        SELECT m.id, m.nombre, m.temporada, m.estado, m.fecha_evento, m.dias_juego, m.hora_inicio,
               m.categoria_id, c.nombre AS categoria_nombre, c.orden_nivel
        FROM masters m JOIN categorias c ON c.id = m.categoria_id
        WHERE m.publicado = true AND m.temporada = ${Number(temporada)}
        ORDER BY c.orden_nivel ASC`
    : await sql`
        SELECT m.id, m.nombre, m.temporada, m.estado, m.fecha_evento, m.dias_juego, m.hora_inicio,
               m.categoria_id, c.nombre AS categoria_nombre, c.orden_nivel
        FROM masters m JOIN categorias c ON c.id = m.categoria_id
        WHERE m.publicado = true
        ORDER BY m.temporada DESC, c.orden_nivel ASC`;

  return NextResponse.json({ masters });
}
