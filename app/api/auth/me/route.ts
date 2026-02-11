import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(null, { status: 401 });
  }

  if (session.rol === "jugador") {
    const info = await sql`
      SELECT u.jugador_id, j.nombre, j.apellido, j.puntos_totales, c.nombre as categoria_nombre,
             (SELECT COUNT(*) + 1 FROM jugadores j2 
              JOIN jugador_categorias jc2 ON jc2.jugador_id = j2.id 
              WHERE jc2.categoria_id = jc.categoria_id AND j2.puntos_totales > j.puntos_totales) as ranking
      FROM usuarios u
      LEFT JOIN jugadores j ON j.id = u.jugador_id
      LEFT JOIN jugador_categorias jc ON jc.jugador_id = u.jugador_id
      LEFT JOIN categorias c ON c.id = jc.categoria_id
      WHERE u.id = ${session.userId}
      LIMIT 1
    `;
    return NextResponse.json({
      ...session,
      nombre: info[0]?.nombre || session.nombre,
      apellido: info[0]?.apellido || "",
      categoria_nombre: info[0]?.categoria_nombre || null,
      jugador_id: info[0]?.jugador_id || null,
      ranking: info[0]?.ranking || null,
      puntos_totales: info[0]?.puntos_totales || 0,
    });
  }

  return NextResponse.json(session);
}
