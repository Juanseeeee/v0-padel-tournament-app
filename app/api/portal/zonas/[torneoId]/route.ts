import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ torneoId: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { torneoId } = await params;

  const zonas = await sql`
    SELECT z.id, z.nombre, z.estado,
           array_agg(json_build_object(
             'orden', pz.orden_partido,
             'jugador1', COALESCE(j1.nombre || ' ' || j1.apellido, 'TBD'),
             'jugador2', COALESCE(j2.nombre || ' ' || j2.apellido, 'TBD'),
             'ganador', CASE WHEN pz.ganador_id IS NOT NULL THEN 
               CASE WHEN pz.ganador_id = pz.pareja1_id THEN 
                 (SELECT j.nombre || ' ' || j.apellido FROM parejas_torneo pt2 
                  JOIN jugadores j ON pt2.jugador1_id = j.id WHERE pt2.id = pz.pareja1_id LIMIT 1)
               WHEN pz.ganador_id = pz.pareja2_id THEN
                 (SELECT j.nombre || ' ' || j.apellido FROM parejas_torneo pt2 
                  JOIN jugadores j ON pt2.jugador1_id = j.id WHERE pt2.id = pz.pareja2_id LIMIT 1)
               END
               ELSE NULL END,
             'set1_j1', pz.set1_pareja1,
             'set1_j2', pz.set1_pareja2,
             'set2_j1', pz.set2_pareja1,
             'set2_j2', pz.set2_pareja2
           ) ORDER BY pz.orden_partido) as partidos
    FROM zonas z
    LEFT JOIN partidos_zona pz ON pz.zona_id = z.id
    LEFT JOIN parejas_torneo pt1 ON pz.pareja1_id = pt1.id
    LEFT JOIN jugadores j1 ON pt1.jugador1_id = j1.id
    LEFT JOIN parejas_torneo pt2 ON pz.pareja2_id = pt2.id
    LEFT JOIN jugadores j2 ON pt2.jugador1_id = j2.id
    WHERE z.fecha_torneo_id = ${torneoId}
    GROUP BY z.id, z.nombre, z.estado
    ORDER BY z.nombre
  `;

  return NextResponse.json(zonas);
}
