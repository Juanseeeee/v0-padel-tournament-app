import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getTop8 } from "@/lib/masters";
import { NextResponse } from "next/server";

// POST /api/admin/masters/generar  { temporada, categoria_id? }
// Crea el/los master(s) y toma el snapshot del top-8 de cada categoría.
// Idempotente: no duplica masters existentes ni pisa un sorteo ya hecho.
export async function POST(request: Request) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { temporada, categoria_id } = await request.json();
  if (!temporada) return NextResponse.json({ error: "Falta la temporada" }, { status: 400 });

  const categorias = categoria_id
    ? await sql`SELECT id, nombre FROM categorias WHERE id = ${categoria_id}`
    : await sql`SELECT id, nombre FROM categorias ORDER BY orden_nivel ASC`;

  let creados = 0;
  let omitidos = 0;
  const resultados: any[] = [];

  for (const cat of categorias) {
    const existente = await sql`
      SELECT id FROM masters WHERE categoria_id = ${cat.id} AND temporada = ${temporada}
    `;
    if (existente.length > 0) {
      omitidos++;
      resultados.push({ categoria: cat.nombre, estado: "ya existía", master_id: existente[0].id });
      continue;
    }

    const nombre = `Master ${temporada} - ${cat.nombre}`;
    const inserted = await sql`
      INSERT INTO masters (categoria_id, temporada, nombre, estado)
      VALUES (${cat.id}, ${temporada}, ${nombre}, 'borrador')
      RETURNING id
    `;
    const masterId = inserted[0].id;

    const top = await getTop8(cat.id);
    for (let i = 0; i < top.length; i++) {
      const j = top[i];
      await sql`
        INSERT INTO master_participantes (master_id, jugador_id, seed, puntos)
        VALUES (${masterId}, ${j.id}, ${i + 1}, ${Number(j.puntos) || 0})
      `;
    }

    creados++;
    resultados.push({ categoria: cat.nombre, estado: "creado", master_id: masterId, clasificados: top.length });
  }

  return NextResponse.json({ success: true, creados, omitidos, resultados });
}
