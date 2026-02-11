import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  const fechas = await sql`
    SELECT f.id, f.numero_fecha, f.temporada, f.fecha_calendario, f.sede, f.direccion, f.estado
    FROM fechas_torneo f
    WHERE f.categoria_id = ${categoriaId}
    ORDER BY f.fecha_calendario ASC
  `;

  return NextResponse.json(fechas);
}

