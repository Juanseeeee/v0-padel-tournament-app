import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";
  const categoriaId = searchParams.get("categoria_id");
  const listAll = searchParams.get("all") === "1";

  if (!categoriaId) {
    return NextResponse.json([]);
  }

  if (!listAll && q.length < 2) {
    return NextResponse.json([]);
  }

  // Get current user's jugador_id to exclude them
  const user = await sql`SELECT jugador_id FROM usuarios WHERE id = ${session.userId}`;
  const myJugadorId = user[0]?.jugador_id;

  let jugadores;
  if (listAll) {
    jugadores = await sql`
      SELECT j.id as jugador_id, j.nombre, j.apellido, j.localidad
      FROM jugadores j
      JOIN jugador_categorias jc ON jc.jugador_id = j.id
      WHERE jc.categoria_id = ${parseInt(categoriaId)}
        AND j.estado = 'activo'
        AND j.id != ${myJugadorId}
      ORDER BY j.apellido, j.nombre
    `;
  } else {
    jugadores = await sql`
      SELECT j.id as jugador_id, j.nombre, j.apellido, j.localidad
      FROM jugadores j
      JOIN jugador_categorias jc ON jc.jugador_id = j.id
      WHERE jc.categoria_id = ${parseInt(categoriaId)}
        AND j.estado = 'activo'
        AND j.id != ${myJugadorId}
        AND (LOWER(j.nombre) LIKE ${'%' + q.toLowerCase() + '%'} 
             OR LOWER(j.apellido) LIKE ${'%' + q.toLowerCase() + '%'})
      ORDER BY j.apellido, j.nombre
      LIMIT 10
    `;
  }

  return NextResponse.json(jugadores);
}
