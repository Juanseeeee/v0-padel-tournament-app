import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get the player's categoria
  const user = await sql`
    SELECT u.jugador_id, jc.categoria_id
    FROM usuarios u
    JOIN jugador_categorias jc ON jc.jugador_id = u.jugador_id
    WHERE u.id = ${session.userId}
    LIMIT 1
  `;

  if (!user[0]?.categoria_id) {
    return NextResponse.json([]);
  }

  const categoriaId = user[0].categoria_id;

  // Get open tournaments for this category
  const torneos = await sql`
    SELECT 
      f.id,
      f.numero_fecha,
      f.temporada,
      f.estado,
      f.fecha_calendario,
      f.sede,
      f.direccion,
      f.hora_inicio_viernes,
      f.hora_inicio_sabado,
      f.duracion_partido_min,
      f.categoria_id,
      c.nombre as categoria_nombre,
      (
        SELECT COUNT(*)
        FROM parejas_torneo pt
        WHERE pt.fecha_torneo_id = f.id AND pt.categoria_id = f.categoria_id
      ) as parejas_count
    FROM fechas_torneo f
    JOIN categorias c ON c.id = f.categoria_id
    WHERE f.estado = 'programada'
      AND f.categoria_id = ${categoriaId}
    ORDER BY f.fecha_calendario ASC
  `;

  return NextResponse.json(torneos);
}
