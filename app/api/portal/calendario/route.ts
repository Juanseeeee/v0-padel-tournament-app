import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const catParam = searchParams.get("categoria_id");
  const month = searchParams.get("month"); // "YYYY-MM"
  
  let targetCategoriaId = catParam ? parseInt(catParam) : null;
  
  let query = `
    SELECT f.id, f.numero_fecha, f.temporada, f.fecha_calendario, f.sede, f.direccion, f.estado,
           c.nombre as categoria_nombre, f.categoria_id
    FROM fechas_torneo f
    JOIN categorias c ON c.id = f.categoria_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (targetCategoriaId) {
    query += ` AND f.categoria_id = $${params.length + 1}`;
    params.push(targetCategoriaId);
  }

  if (month) {
    const [yearStr, monthStr] = month.split("-");
    if (yearStr && monthStr) {
       // Check if fecha_calendario is DATE or TEXT. Assuming DATE for TO_CHAR.
       // If TEXT 'YYYY-MM-DD', TO_CHAR(text::date, 'YYYY-MM') works.
       query += ` AND TO_CHAR(f.fecha_calendario::DATE, 'YYYY-MM') = $${params.length + 1}`;
       params.push(month);
    }
  }

  query += ` ORDER BY f.fecha_calendario ASC`;

  // Use sql.query for dynamic queries constructed as strings
  const result = await (sql as any).query(query, params);
  const fechas = result.rows || result; // Handle both result object or direct rows just in case

  return NextResponse.json(fechas);
}

