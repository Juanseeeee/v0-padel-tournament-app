import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === 'undefined' || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Invalid torneo ID' }, { status: 400 });
  }

  try {
    const parejas = await sql`
      SELECT 
        pt.*,
        j1.nombre as jugador1_nombre,
        j1.apellido as jugador1_apellido,
        j2.nombre as jugador2_nombre,
        j2.apellido as jugador2_apellido,
        c.nombre as categoria_nombre
      FROM parejas_torneo pt
      JOIN jugadores j1 ON pt.jugador1_id = j1.id
      JOIN jugadores j2 ON pt.jugador2_id = j2.id
      JOIN categorias c ON pt.categoria_id = c.id
      WHERE pt.fecha_torneo_id = ${parseInt(id)}
      ORDER BY pt.categoria_id, pt.cabeza_serie DESC, pt.numero_pareja
    `;

    return NextResponse.json(parejas);
  } catch (error) {
    console.error("Error fetching parejas:", error);
    return NextResponse.json({ error: "Error al obtener parejas" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { jugador1_id, jugador2_id, categoria_id, cabeza_serie, dia_preferido, hora_disponible, zona_id } = body as any;

  try {
    // Verificar que los jugadores no estén ya en otra pareja de este torneo
    const existingParejas = await sql`
      SELECT * FROM parejas_torneo 
      WHERE fecha_torneo_id = ${parseInt(id)}
      AND (jugador1_id = ${jugador1_id} OR jugador2_id = ${jugador1_id}
           OR jugador1_id = ${jugador2_id} OR jugador2_id = ${jugador2_id})
    `;

    if (existingParejas.length > 0) {
      return NextResponse.json(
        { error: "Uno o ambos jugadores ya están inscriptos en este torneo" },
        { status: 400 }
      );
    }

    // Obtener el siguiente número de pareja para esta categoría
    const maxNumero = await sql`
      SELECT COALESCE(MAX(numero_pareja), 0) as max_num 
      FROM parejas_torneo 
      WHERE fecha_torneo_id = ${parseInt(id)} AND categoria_id = ${categoria_id}
    `;
    const numero_pareja = (maxNumero[0]?.max_num || 0) + 1;

    // Validar zona antes de crear la pareja
    if (zona_id) {
      const [zona] = await sql`
        SELECT * FROM zonas WHERE id = ${parseInt(zona_id)} AND fecha_torneo_id = ${parseInt(id)} AND estado != 'finalizada'
      `;
      if (!zona) {
        return NextResponse.json({ error: "Zona no válida para asignación" }, { status: 400 });
      }
      
      const countRes = await sql`
        SELECT COUNT(*) as count FROM parejas_zona WHERE zona_id = ${parseInt(zona_id)}
      `;
      const currentCount = parseInt(countRes[0].count);
      const maxCap = (zona.formato || 3); // Simplificado: usar formato de zona o default
      
      // Validación estricta de capacidad
      if (currentCount >= maxCap) {
        return NextResponse.json({ error: `La zona ya tiene ${currentCount}/${maxCap} parejas` }, { status: 400 });
      }
    }

    const result = await sql`
      INSERT INTO parejas_torneo (fecha_torneo_id, jugador1_id, jugador2_id, categoria_id, numero_pareja, cabeza_serie, dia_preferido, hora_disponible)
      VALUES (${parseInt(id)}, ${jugador1_id}, ${jugador2_id}, ${categoria_id}, ${numero_pareja}, ${cabeza_serie || false}, ${dia_preferido || null}, ${hora_disponible || null})
      RETURNING *
    `;

    const creada = result[0];

    // Audit Log
    try {
        await sql`
            INSERT INTO audit_logs (action, details, user_id)
            VALUES ('create_pair', ${JSON.stringify({ 
                pareja_id: creada.id, 
                torneo_id: parseInt(id),
                jugador1_id, 
                jugador2_id,
                zona_id: zona_id || null
            })}, NULL)
        `;
    } catch (e) {
        console.error("Error writing audit log:", e);
    }

    if (zona_id) {
      // Re-verificar zona (aunque ya verificamos, para evitar race conditions podría fallar aquí, pero es aceptable)
      try {
          const countRes = await sql`SELECT COUNT(*) as count FROM parejas_zona WHERE zona_id = ${parseInt(zona_id)}`;
          const currentCount = parseInt(countRes[0].count);
          
          await sql`
            INSERT INTO parejas_zona (zona_id, pareja_id, posicion_final)
            VALUES (${parseInt(zona_id)}, ${creada.id}, ${currentCount + 1})
          `;
          await regenerateZoneMatches(parseInt(zona_id), parseInt(id));
      } catch (err) {
          console.error("Error assigning zone:", err);
          
          // ROLLBACK: Eliminar la pareja creada para evitar inconsistencias
          try {
            await sql`DELETE FROM parejas_torneo WHERE id = ${creada.id}`;
            
            // Registrar rollback en audit logs
            await sql`
              INSERT INTO audit_logs (action, details, user_id)
              VALUES ('rollback_create_pair', ${JSON.stringify({ 
                  pareja_id: creada.id, 
                  reason: 'zone_assignment_failed', 
                  original_error: String(err) 
              })}, NULL)
            `;
          } catch (rollbackErr) {
            console.error("Error during rollback:", rollbackErr);
          }

          return NextResponse.json({ error: "Error al asignar zona. Se canceló la creación de la pareja." }, { status: 500 });
      }
    }

    return NextResponse.json(creada);
  } catch (error) {
    console.error("Error creating pareja:", error);
    return NextResponse.json({ error: "Error al crear pareja" }, { status: 500 });
  }
}

async function regenerateZoneMatches(zonaId: number, torneoId: number) {
  const parejasZona = await sql`SELECT pareja_id FROM parejas_zona WHERE zona_id = ${zonaId} ORDER BY posicion_final ASC, id ASC`;
  if (parejasZona.length < 2) return;
  await sql`DELETE FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'pendiente'`;
  const existentes = await sql`
    SELECT pareja1_id, pareja2_id FROM partidos_zona WHERE zona_id = ${zonaId} AND estado = 'finalizado'
  `;
  const existenteSet = new Set(
    existentes.map((e: any) => `${Math.min(e.pareja1_id, e.pareja2_id)}-${Math.max(e.pareja1_id, e.pareja2_id)}`)
  );
  const ids = parejasZona.map((p: any) => p.pareja_id);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = `${Math.min(ids[i], ids[j])}-${Math.max(ids[i], ids[j])}`;
      if (!existenteSet.has(key)) {
        await sql`
          INSERT INTO partidos_zona (zona_id, fecha_torneo_id, pareja1_id, pareja2_id, tipo_partido, estado)
          VALUES (${zonaId}, ${torneoId}, ${ids[i]}, ${ids[j]}, 'round_robin', 'pendiente')
        `;
      }
    }
  }
}
