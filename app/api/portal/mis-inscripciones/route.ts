import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "jugador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await sql`SELECT jugador_id FROM usuarios WHERE id = ${session.userId}`;
  if (!user[0]?.jugador_id) return NextResponse.json([]);

  const jugadorId = user[0].jugador_id;

  const inscripciones = await sql`
    SELECT pt.id, pt.fecha_torneo_id, pt.dia_preferido, pt.hora_disponible,
           f.numero_fecha, f.fecha_calendario, f.sede, f.estado, 
           f.hora_inicio_viernes, f.hora_inicio_sabado,
           CASE 
             WHEN pt.jugador1_id = ${jugadorId} THEN j2.nombre
             ELSE j1.nombre
           END as companero_nombre,
           CASE 
             WHEN pt.jugador1_id = ${jugadorId} THEN j2.apellido
             ELSE j1.apellido
           END as companero_apellido,
           (SELECT z.estado FROM zonas z 
            JOIN parejas_zona pz ON pz.zona_id = z.id 
            WHERE pz.pareja_id = pt.id 
            AND z.fecha_torneo_id = pt.fecha_torneo_id LIMIT 1) as zona_estado,
           (SELECT z.id FROM zonas z 
            JOIN parejas_zona pz ON pz.zona_id = z.id 
            WHERE pz.pareja_id = pt.id 
            AND z.fecha_torneo_id = pt.fecha_torneo_id LIMIT 1) as zona_id
    FROM parejas_torneo pt
    JOIN fechas_torneo f ON f.id = pt.fecha_torneo_id
    JOIN jugadores j1 ON j1.id = pt.jugador1_id
    JOIN jugadores j2 ON j2.id = pt.jugador2_id
    WHERE (pt.jugador1_id = ${jugadorId} OR pt.jugador2_id = ${jugadorId})
    ORDER BY f.fecha_calendario DESC
  `;

  return NextResponse.json(inscripciones);
}
