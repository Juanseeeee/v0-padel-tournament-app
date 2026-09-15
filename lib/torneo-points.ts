import { sql } from "@/lib/db";
import { rebuildCategoryPoints } from "@/lib/category-points";

/**
 * Recalcula participaciones y puntos de un torneo a partir del estado ACTUAL de
 * sus llaves y zonas. Es idempotente: se puede correr las veces que haga falta
 * (al cerrar el torneo o al editar resultados de un torneo ya cerrado) y siempre
 * deja los puntos consistentes con los resultados cargados.
 *
 * Devuelve la cantidad de jugadores procesados y la categoría del torneo.
 */
export async function recalcularPuntosTorneo(fechaTorneoId: number): Promise<{
  procesados: number;
  categoriaId: number | null;
  detalle: Record<number, string>;
}> {
  const [torneo] = await sql`SELECT * FROM fechas_torneo WHERE id = ${fechaTorneoId}`;
  if (!torneo) throw new Error("Torneo no encontrado");

  const categoriaId = torneo.categoria_id;
  if (!categoriaId) return { procesados: 0, categoriaId: null, detalle: {} };

  // Configuración de puntos (con soporte de fecha doble)
  const puntosConfig = await sql`SELECT * FROM puntos_configuracion ORDER BY orden`;
  const getPuntos = (instancia: string): number => {
    const config = puntosConfig.find((p: any) => p.instancia === instancia);
    const basePoints = config ? config.puntos : 0;
    return torneo.is_double_points ? basePoints * 2 : basePoints;
  };

  // Llaves finalizadas (mayor a menor ronda) con jugadores de cada pareja
  const llaves = await sql`
    SELECT l.*,
      pt1.jugador1_id as p1_j1, pt1.jugador2_id as p1_j2,
      pt2.jugador1_id as p2_j1, pt2.jugador2_id as p2_j2
    FROM llaves l
    LEFT JOIN parejas_torneo pt1 ON pt1.id = l.pareja1_id
    LEFT JOIN parejas_torneo pt2 ON pt2.id = l.pareja2_id
    WHERE l.fecha_torneo_id = ${fechaTorneoId}
      AND l.categoria_id = ${categoriaId}
    ORDER BY
      CASE l.ronda
        WHEN 'final' THEN 5 WHEN 'semis' THEN 4 WHEN '4tos' THEN 3
        WHEN '8vos' THEN 2 WHEN '16avos' THEN 1
      END DESC
  `;

  const jugadorInstancia: Record<number, string> = {};
  const setInstancia = (jugadorId: number, instancia: string) => {
    if (!jugadorId) return;
    if (!jugadorInstancia[jugadorId]) jugadorInstancia[jugadorId] = instancia; // guarda la mejor
  };

  for (const llave of llaves) {
    if (llave.estado !== "finalizado") continue;
    const ganadorPareja = llave.ganador_id === llave.pareja1_id
      ? { j1: llave.p1_j1, j2: llave.p1_j2 }
      : { j1: llave.p2_j1, j2: llave.p2_j2 };
    const perdedorPareja = llave.ganador_id === llave.pareja1_id
      ? { j1: llave.p2_j1, j2: llave.p2_j2 }
      : { j1: llave.p1_j1, j2: llave.p1_j2 };

    if (llave.ronda === "final") {
      setInstancia(ganadorPareja.j1, "campeon");
      setInstancia(ganadorPareja.j2, "campeon");
      setInstancia(perdedorPareja.j1, "finalista");
      setInstancia(perdedorPareja.j2, "finalista");
    } else if (llave.ronda === "semis") {
      setInstancia(perdedorPareja.j1, "semifinalista");
      setInstancia(perdedorPareja.j2, "semifinalista");
    } else if (llave.ronda === "4tos") {
      setInstancia(perdedorPareja.j1, "cuartofinalista");
      setInstancia(perdedorPareja.j2, "cuartofinalista");
    } else if (llave.ronda === "8vos") {
      setInstancia(perdedorPareja.j1, "octavofinalista");
      setInstancia(perdedorPareja.j2, "octavofinalista");
    } else if (llave.ronda === "16avos") {
      setInstancia(perdedorPareja.j1, "16avos");
      setInstancia(perdedorPareja.j2, "16avos");
    }
  }

  // Parejas eliminadas en zona (no llegaron a llaves)
  const parejasZona = await sql`
    SELECT pt.jugador1_id, pt.jugador2_id
    FROM parejas_zona pz
    JOIN zonas z ON z.id = pz.zona_id
    JOIN parejas_torneo pt ON pt.id = pz.pareja_id
    WHERE z.fecha_torneo_id = ${fechaTorneoId}
      AND z.categoria_id = ${categoriaId}
  `;
  for (const pz of parejasZona) {
    if (!jugadorInstancia[pz.jugador1_id]) {
      setInstancia(pz.jugador1_id, "zona");
      setInstancia(pz.jugador2_id, "zona");
    }
  }

  // Idempotencia: borrar participaciones de esta fecha+categoría y TODO el
  // historial de esta fecha (incluye las transferencias 50% a otras categorías,
  // para no duplicarlas al re-ejecutar).
  await sql`
    DELETE FROM participaciones
    WHERE fecha_torneo_id = ${fechaTorneoId} AND categoria_id = ${categoriaId}
  `;
  await sql`DELETE FROM historial_puntos WHERE fecha_torneo_id = ${fechaTorneoId}`;

  let procesados = 0;
  const categoriasDestinoARecalcular = new Set<number>();

  for (const [jugadorIdStr, instancia] of Object.entries(jugadorInstancia)) {
    const jugadorId = parseInt(jugadorIdStr);
    const puntos = getPuntos(instancia);

    await sql`
      INSERT INTO participaciones (jugador_id, fecha_torneo_id, categoria_id, instancia_alcanzada, puntos_obtenidos)
      VALUES (${jugadorId}, ${fechaTorneoId}, ${categoriaId}, ${instancia}, ${puntos})
      ON CONFLICT (jugador_id, fecha_torneo_id, categoria_id)
      DO UPDATE SET instancia_alcanzada = ${instancia}, puntos_obtenidos = ${puntos}
    `;

    // Si el jugador ya no está en la categoría (fue ascendido antes de cerrar),
    // transferir 50% de estos puntos a su categoría destino.
    const enCategoria = await sql`
      SELECT 1 FROM jugador_categorias
      WHERE jugador_id = ${jugadorId} AND categoria_id = ${categoriaId}
    `;
    if (enCategoria.length === 0) {
      const ultimosAscensos = await sql`
        SELECT categoria_destino_id FROM ascensos
        WHERE jugador_id = ${jugadorId} AND categoria_origen_id = ${categoriaId}
        ORDER BY fecha_ascenso DESC LIMIT 1
      `;
      if (ultimosAscensos.length > 0) {
        const categoriaDestinoId = ultimosAscensos[0].categoria_destino_id;
        const puntosTransferir = Math.floor(puntos * 0.5);
        if (puntosTransferir > 0) {
          categoriasDestinoARecalcular.add(Number(categoriaDestinoId));
          await sql`
            INSERT INTO historial_puntos (jugador_id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo)
            VALUES (${jugadorId}, ${categoriaDestinoId}, ${fechaTorneoId}, ${puntosTransferir}, ${`Transferencia 50% puntos torneo anterior (${instancia})`})
          `;
        }
      }
    }

    // Historial por fecha (tracking)
    await sql`
      INSERT INTO historial_puntos (jugador_id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo)
      VALUES (${jugadorId}, ${categoriaId}, ${fechaTorneoId}, ${puntos}, ${instancia})
      ON CONFLICT DO NOTHING
    `;

    procesados++;
  }

  // Recalcular puntos acumulados de la categoría y de las categorías destino.
  await rebuildCategoryPoints(categoriaId);
  for (const destino of categoriasDestinoARecalcular) {
    await rebuildCategoryPoints(destino);
  }

  return { procesados, categoriaId, detalle: jugadorInstancia };
}
