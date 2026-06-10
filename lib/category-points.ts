import { sql } from "@/lib/db";

const RESULT_RANK_TO_NAME: Record<number, string> = {
  6: "campeon",
  5: "finalista",
  4: "semifinalista",
  3: "cuartofinalista",
  2: "octavofinalista",
  1: "16avos",
  0: "zona",
};

export async function rebuildCategoryPoints(categoriaId: number) {
  if (!categoriaId) return;

  const rows = await sql`
    WITH participaciones_agg AS (
      SELECT
        jugador_id,
        SUM(puntos_obtenidos) AS puntos_torneo,
        COUNT(DISTINCT fecha_torneo_id) AS torneos_jugados,
        MAX(
          CASE instancia_alcanzada
            WHEN 'campeon' THEN 6
            WHEN 'finalista' THEN 5
            WHEN 'semifinalista' THEN 4
            WHEN 'cuartofinalista' THEN 3
            WHEN 'octavofinalista' THEN 2
            WHEN '16avos' THEN 1
            ELSE 0
          END
        ) AS mejor_rank
      FROM participaciones
      WHERE categoria_id = ${categoriaId}
      GROUP BY jugador_id
    ),
    ascensos_agg AS (
      SELECT
        jugador_id,
        SUM(puntos_transferidos) AS puntos_arrastre
      FROM ascensos
      WHERE categoria_destino_id = ${categoriaId}
      GROUP BY jugador_id
    ),
    transferencias_torneo_agg AS (
      SELECT
        jugador_id,
        SUM(puntos_acumulados) AS puntos_transferidos_torneo
      FROM historial_puntos
      WHERE categoria_id = ${categoriaId}
        AND fecha_torneo_id IS NOT NULL
        AND motivo ILIKE 'Transferencia 50% puntos torneo anterior (%'
      GROUP BY jugador_id
    ),
    jugadores_con_puntos AS (
      SELECT COALESCE(p.jugador_id, a.jugador_id, t.jugador_id) AS jugador_id,
             COALESCE(p.puntos_torneo, 0) AS puntos_torneo,
             COALESCE(a.puntos_arrastre, 0) AS puntos_arrastre,
             COALESCE(t.puntos_transferidos_torneo, 0) AS puntos_transferidos_torneo,
             COALESCE(p.torneos_jugados, 0) AS torneos_jugados,
             p.mejor_rank
      FROM participaciones_agg p
      FULL OUTER JOIN ascensos_agg a ON a.jugador_id = p.jugador_id
      FULL OUTER JOIN transferencias_torneo_agg t
        ON t.jugador_id = COALESCE(p.jugador_id, a.jugador_id)
    )
    SELECT
      jugador_id,
      (puntos_torneo + puntos_arrastre + puntos_transferidos_torneo) AS puntos_acumulados,
      torneos_jugados,
      mejor_rank
    FROM jugadores_con_puntos
    WHERE (puntos_torneo + puntos_arrastre + puntos_transferidos_torneo) > 0
  `;

  await sql`DELETE FROM puntos_categoria WHERE categoria_id = ${categoriaId}`;

  for (const row of rows) {
    await sql`
      INSERT INTO puntos_categoria (jugador_id, categoria_id, puntos_acumulados, torneos_jugados, mejor_resultado)
      VALUES (
        ${row.jugador_id},
        ${categoriaId},
        ${Number(row.puntos_acumulados || 0)},
        ${Number(row.torneos_jugados || 0)},
        ${row.mejor_rank === null ? null : RESULT_RANK_TO_NAME[Number(row.mejor_rank)] || "zona"}
      )
    `;
  }
}
