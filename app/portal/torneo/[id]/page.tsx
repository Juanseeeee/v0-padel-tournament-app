import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TournamentView } from "./tournament-view";

export default async function TournamentPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    redirect("/login?redirect=/portal");
  }

  const { id } = await params;

  // 1. Get Tournament Info
  const torneo = await sql`
    SELECT f.*, c.nombre as categoria_nombre
    FROM fechas_torneo f
    JOIN categorias c ON f.categoria_id = c.id
    WHERE f.id = ${id}
  `;

  if (!torneo[0]) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Torneo no encontrado</h1>
                <p className="text-muted-foreground mt-2">El torneo que buscas no existe o ha sido eliminado.</p>
                <a href="/portal" className="mt-4 inline-block text-primary hover:underline">Volver al Portal</a>
            </div>
        </div>
    );
  }

  // 2. Get Zones and Matches
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
           ) ORDER BY pz.orden_partido) FILTER (WHERE pz.id IS NOT NULL) as partidos
    FROM zonas z
    LEFT JOIN partidos_zona pz ON pz.zona_id = z.id
    LEFT JOIN parejas_torneo pt1 ON pz.pareja1_id = pt1.id
    LEFT JOIN jugadores j1 ON pt1.jugador1_id = j1.id
    LEFT JOIN parejas_torneo pt2 ON pz.pareja2_id = pt2.id
    LEFT JOIN jugadores j2 ON pt2.jugador1_id = j2.id
    WHERE z.fecha_torneo_id = ${id}
    GROUP BY z.id, z.nombre, z.estado
    ORDER BY z.nombre
  `;

  // 3. Get Brackets (Llaves)
  const llaves = await sql`
    SELECT 
      l.*,
      l.pareja1_id, l.pareja2_id, l.ganador_id,
      pt1.numero_pareja as pareja1_numero,
      pt2.numero_pareja as pareja2_numero,
      CONCAT(j1a.nombre, ' ', LEFT(j1a.apellido, 1), '. / ', j1b.nombre, ' ', LEFT(j1b.apellido, 1), '.') as pareja1_jugadores,
      CONCAT(j2a.nombre, ' ', LEFT(j2a.apellido, 1), '. / ', j2b.nombre, ' ', LEFT(j2b.apellido, 1), '.') as pareja2_jugadores
    FROM llaves l
    LEFT JOIN parejas_torneo pt1 ON l.pareja1_id = pt1.id
    LEFT JOIN parejas_torneo pt2 ON l.pareja2_id = pt2.id
    LEFT JOIN jugadores j1a ON pt1.jugador1_id = j1a.id
    LEFT JOIN jugadores j1b ON pt1.jugador2_id = j1b.id
    LEFT JOIN jugadores j2a ON pt2.jugador1_id = j2a.id
    LEFT JOIN jugadores j2b ON pt2.jugador2_id = j2b.id
    WHERE l.fecha_torneo_id = ${id}
    ORDER BY 
      CASE l.ronda 
        WHEN '16avos' THEN 1 
        WHEN '8vos' THEN 2 
        WHEN '4tos' THEN 3 
        WHEN 'semis' THEN 4 
        WHEN 'final' THEN 5 
      END,
      l.posicion
  `;

  return (
    <TournamentView 
      torneo={torneo[0]} 
      zonas={zonas as any} 
      llaves={llaves as any} 
    />
  );
}
