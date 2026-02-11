import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const torneoId = parseInt(id);

  try {
    // Verificar que el torneo existe y no está finalizado
    const torneo = await sql`SELECT * FROM fechas_torneo WHERE id = ${torneoId}`;
    if (torneo.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    if (torneo[0].estado === "finalizada") {
      return NextResponse.json({ error: "El torneo ya está finalizado" }, { status: 400 });
    }

    // Obtener configuración de puntos
    const puntosConfig = await sql`
      SELECT * FROM puntos_configuracion ORDER BY orden ASC
    `;

    // Mapear puntos por instancia
    const puntosMap: Record<string, number> = {};
    for (const pc of puntosConfig) {
      puntosMap[pc.instancia] = pc.puntos;
    }

    // Obtener todas las categorías con parejas en este torneo
    const categoriasConParejas = await sql`
      SELECT DISTINCT categoria_id FROM parejas_torneo WHERE fecha_torneo_id = ${torneoId}
    `;

    for (const cat of categoriasConParejas) {
      const categoriaId = cat.categoria_id;

      // Obtener las llaves de esta categoría
      const llaves = await sql`
        SELECT * FROM llaves 
        WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoriaId}
        ORDER BY 
          CASE ronda 
            WHEN 'final' THEN 1 
            WHEN 'semifinal' THEN 2 
            WHEN '4tos' THEN 3 
            WHEN '8vos' THEN 4 
            WHEN '16avos' THEN 5 
          END
      `;

      // Procesar resultados de llaves
      const resultadosParejas: Map<number, string> = new Map();

      // Encontrar la final
      const final = llaves.find((l) => l.ronda === "final");
      if (final && final.completado && final.ganador_id) {
        // Campeón
        resultadosParejas.set(final.ganador_id, "campeon");
        // Subcampeón
        const subcampeon = final.pareja1_id === final.ganador_id ? final.pareja2_id : final.pareja1_id;
        if (subcampeon) resultadosParejas.set(subcampeon, "subcampeon");
      }

      // Semifinalistas perdedores = 3er puesto
      const semis = llaves.filter((l) => l.ronda === "semifinal" && l.completado);
      for (const semi of semis) {
        if (semi.ganador_id) {
          const perdedor = semi.pareja1_id === semi.ganador_id ? semi.pareja2_id : semi.pareja1_id;
          if (perdedor && !resultadosParejas.has(perdedor)) {
            resultadosParejas.set(perdedor, "semifinal");
          }
        }
      }

      // Cuartofinalistas perdedores
      const cuartos = llaves.filter((l) => l.ronda === "4tos" && l.completado);
      for (const cuarto of cuartos) {
        if (cuarto.ganador_id) {
          const perdedor = cuarto.pareja1_id === cuarto.ganador_id ? cuarto.pareja2_id : cuarto.pareja1_id;
          if (perdedor && !resultadosParejas.has(perdedor)) {
            resultadosParejas.set(perdedor, "4tos");
          }
        }
      }

      // Octavos perdedores
      const octavos = llaves.filter((l) => l.ronda === "8vos" && l.completado);
      for (const octavo of octavos) {
        if (octavo.ganador_id) {
          const perdedor = octavo.pareja1_id === octavo.ganador_id ? octavo.pareja2_id : octavo.pareja1_id;
          if (perdedor && !resultadosParejas.has(perdedor)) {
            resultadosParejas.set(perdedor, "8vos");
          }
        }
      }

      // 16avos perdedores
      const dieciseisavos = llaves.filter((l) => l.ronda === "16avos" && l.completado);
      for (const d of dieciseisavos) {
        if (d.ganador_id) {
          const perdedor = d.pareja1_id === d.ganador_id ? d.pareja2_id : d.pareja1_id;
          if (perdedor && !resultadosParejas.has(perdedor)) {
            resultadosParejas.set(perdedor, "16avos");
          }
        }
      }

      // Obtener parejas que no clasificaron a llaves (quedaron en zona)
      const parejasEnZona = await sql`
        SELECT DISTINCT pt.id, pt.jugador1_id, pt.jugador2_id
        FROM parejas_torneo pt
        WHERE pt.fecha_torneo_id = ${torneoId} 
          AND pt.categoria_id = ${categoriaId}
          AND pt.id NOT IN (
            SELECT DISTINCT COALESCE(pareja1_id, 0) FROM llaves WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoriaId}
            UNION
            SELECT DISTINCT COALESCE(pareja2_id, 0) FROM llaves WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoriaId}
          )
      `;

      for (const pz of parejasEnZona) {
        if (!resultadosParejas.has(pz.id)) {
          resultadosParejas.set(pz.id, "zona");
        }
      }

      // Asignar puntos a cada jugador basado en instancia alcanzada
      for (const [parejaId, instancia] of resultadosParejas) {
        const puntos = puntosMap[instancia] || 0;

        // Obtener datos de la pareja
        const pareja = await sql`
          SELECT * FROM parejas_torneo WHERE id = ${parejaId}
        `;

        if (pareja.length > 0) {
          const p = pareja[0];

          // Registrar participación y puntos para ambos jugadores
          for (const jugadorId of [p.jugador1_id, p.jugador2_id]) {
            // Crear participación
            await sql`
              INSERT INTO participaciones (jugador_id, fecha_torneo_id, categoria_id, instancia_alcanzada, puntos_obtenidos)
              VALUES (${jugadorId}, ${torneoId}, ${categoriaId}, ${instancia}, ${puntos})
              ON CONFLICT DO NOTHING
            `;

            // Crear historial de puntos
            await sql`
              INSERT INTO historial_puntos (jugador_id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo)
              VALUES (${jugadorId}, ${categoriaId}, ${torneoId}, ${puntos}, ${`Fecha ${torneo[0].numero_fecha} - ${instancia}`})
            `;

            // Actualizar puntos totales del jugador
            await sql`
              UPDATE jugadores 
              SET puntos_totales = puntos_totales + ${puntos}, updated_at = NOW()
              WHERE id = ${jugadorId}
            `;
          }
        }
      }
    }

    // Marcar torneo como finalizado
    await sql`
      UPDATE fechas_torneo SET estado = 'finalizada' WHERE id = ${torneoId}
    `;

    return NextResponse.json({ success: true, message: "Torneo finalizado y puntos asignados" });
  } catch (error) {
    console.error("Error finalizing torneo:", error);
    return NextResponse.json({ error: "Error al finalizar torneo" }, { status: 500 });
  }
}
