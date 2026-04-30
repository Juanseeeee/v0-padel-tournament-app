import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ascensos = await sql`
      SELECT 
        a.id, 
        a.fecha_ascenso,
        a.puntos_transferidos,
        j.id as jugador_id,
        j.nombre as jugador_nombre,
        j.apellido as jugador_apellido,
        co.nombre as categoria_origen,
        cd.nombre as categoria_destino
      FROM ascensos a
      JOIN jugadores j ON a.jugador_id = j.id
      JOIN categorias co ON a.categoria_origen_id = co.id
      JOIN categorias cd ON a.categoria_destino_id = cd.id
      ORDER BY a.fecha_ascenso DESC
    `;
    
    return NextResponse.json({ ascensos });
  } catch (error) {
    console.error('Error fetching ascensos:', error);
    return NextResponse.json({ error: 'Error fetching ascensos' }, { status: 500 });
  }
}
