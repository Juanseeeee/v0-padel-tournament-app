import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { buildTorneosQuery } from "@/lib/logic/torneos";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get query params
  const { searchParams } = new URL(request.url);
  const catParam = searchParams.get("categoria_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const targetCategoriaId = catParam ? parseInt(catParam) : null;

  const { query, countQuery, params, countParams } = buildTorneosQuery({ 
    categoryId: targetCategoriaId, 
    page, 
    limit,
    publicOnly: true
  });

  // Count query
  // We must use countParams which excludes limit/offset, matching the countQuery placeholders
  
  // Use sql.query for dynamic queries constructed as strings
  const countResult = await (sql as any).query(countQuery, countParams);
  const total = parseInt((countResult.rows || countResult)[0].count);

  const torneosResult = await (sql as any).query(query, params);
  const torneos = torneosResult.rows || torneosResult;

  return NextResponse.json({
    data: torneos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
