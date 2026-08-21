import { randomInt } from "crypto";
import { sql } from "@/lib/db";

export const RONDAS_MASTER = ["cuartos", "semis", "final"] as const;

// Estructura fija de una llave de 8 equipos (seeds 1..8), con reparto de byes
// estándar: los seeds altos que no existan quedan null y su rival avanza directo.
//   cuartos: 1v8, 4v5, 3v6, 2v7  → semis → final
const BRACKET_8 = [
  { ronda: "cuartos", posicion: 1, e1: 1, e2: 8 },
  { ronda: "cuartos", posicion: 2, e1: 4, e2: 5 },
  { ronda: "cuartos", posicion: 3, e1: 3, e2: 6 },
  { ronda: "cuartos", posicion: 4, e1: 2, e2: 7 },
  { ronda: "semis", posicion: 1, e1: null, e2: null },
  { ronda: "semis", posicion: 2, e1: null, e2: null },
  { ronda: "final", posicion: 1, e1: null, e2: null },
] as const;

// Cableado: [rondaOrigen, posOrigen] -> [rondaDestino, posDestino, slot]
const WIRING: Array<[string, number, string, number, number]> = [
  ["cuartos", 1, "semis", 1, 1],
  ["cuartos", 2, "semis", 1, 2],
  ["cuartos", 3, "semis", 2, 1],
  ["cuartos", 4, "semis", 2, 2],
  ["semis", 1, "final", 1, 1],
  ["semis", 2, "final", 1, 2],
];

/** Top-16 de una categoría, mismo criterio que el ranking público. */
export async function getTop16(categoriaId: number) {
  return await sql`
    SELECT j.id, j.nombre, j.apellido, j.localidad,
           COALESCE(pc.puntos_acumulados, 0) AS puntos
    FROM jugador_categorias jc
    JOIN jugadores j ON j.id = jc.jugador_id
    LEFT JOIN puntos_categoria pc
      ON pc.jugador_id = j.id AND pc.categoria_id = ${categoriaId}
    WHERE jc.categoria_id = ${categoriaId}
      AND j.estado = 'activo'
      AND COALESCE(pc.puntos_acumulados, 0) > 0
    ORDER BY COALESCE(pc.puntos_acumulados, 0) DESC, j.nombre ASC
    LIMIT 16
  `;
}

/**
 * Ranking completo de la categoría con señales de aptitud y fechas jugadas.
 * Sirve para el panel de "todos los jugadores" y para las recomendaciones.
 */
export async function getCategoriaAptitud(categoriaId: number) {
  const rows = await sql`
    WITH fechas_fin AS (
      SELECT id, numero_fecha FROM fechas_torneo
      WHERE categoria_id = ${categoriaId} AND estado = 'finalizada'
    ),
    ultimas3 AS (SELECT id FROM fechas_fin ORDER BY numero_fecha DESC LIMIT 3),
    total AS (SELECT COUNT(*)::int AS n FROM fechas_fin),
    part AS (
      SELECT jugador_id,
             COUNT(DISTINCT fecha_torneo_id) AS jugadas,
             COUNT(DISTINCT fecha_torneo_id) FILTER (WHERE fecha_torneo_id IN (SELECT id FROM ultimas3)) AS jugadas_ultimas3
      FROM participaciones WHERE categoria_id = ${categoriaId} GROUP BY jugador_id
    )
    SELECT j.id, j.nombre, j.apellido, j.localidad,
           COALESCE(pc.puntos_acumulados, 0) AS puntos,
           COALESCE(p.jugadas, 0) AS fechas_jugadas,
           (SELECT n FROM total) AS fechas_totales,
           COALESCE(p.jugadas_ultimas3, 0) AS jugadas_ultimas3
    FROM jugador_categorias jc
    JOIN jugadores j ON j.id = jc.jugador_id
    LEFT JOIN puntos_categoria pc ON pc.jugador_id = j.id AND pc.categoria_id = ${categoriaId}
    LEFT JOIN part p ON p.jugador_id = j.id
    WHERE jc.categoria_id = ${categoriaId} AND j.estado = 'activo'
    ORDER BY COALESCE(pc.puntos_acumulados, 0) DESC, j.nombre ASC
  `;
  return rows.map((r: any) => {
    const total = Number(r.fechas_totales) || 0;
    const jugadas = Number(r.fechas_jugadas) || 0;
    const porcentaje = total > 0 ? jugadas / total : 0;
    return {
      id: r.id,
      nombre: r.nombre,
      apellido: r.apellido,
      localidad: r.localidad,
      puntos: Number(r.puntos) || 0,
      fechas_jugadas: jugadas,
      fechas_totales: total,
      jugo_2_de_ultimas_3: Number(r.jugadas_ultimas3) >= 2,
      porcentaje_fechas: Math.round(porcentaje * 100),
      jugo_60pct: porcentaje >= 0.6,
    };
  });
}

/**
 * Resincroniza los clasificados con el top-16 vigente del ranking (para que la
 * lista se actualice con los resultados hasta diciembre). Sólo actúa en estado
 * 'borrador' y PRESERVA los reemplazos manuales. No hace nada una vez sorteado.
 */
export async function reconcileParticipantes(masterId: number) {
  const master = (await sql`SELECT categoria_id, estado FROM masters WHERE id = ${masterId}`)[0] as any;
  if (!master || master.estado !== "borrador") return;

  const ranking = (await getCategoriaAptitud(master.categoria_id)).filter((p) => p.puntos > 0);
  const current = await sql`SELECT jugador_id, puntos, es_reemplazo, reemplaza_a_jugador_id FROM master_participantes WHERE master_id = ${masterId}`;

  const reemplazos = current.filter((r: any) => r.es_reemplazo);
  const excluidos = new Set(reemplazos.map((r: any) => r.reemplaza_a_jugador_id).filter(Boolean));
  const forzados = new Set(reemplazos.map((r: any) => r.jugador_id));

  // Base: ranking (sin excluidos ni forzados), rellenando hasta 16 - #reemplazos
  const pool = ranking.filter((p) => !excluidos.has(p.id) && !forzados.has(p.id));
  const base = pool.slice(0, Math.max(0, 16 - reemplazos.length));

  const finalSet = [
    ...base.map((p) => ({ jugador_id: p.id, puntos: p.puntos, es_reemplazo: false, reemplaza_a: null as number | null })),
    ...reemplazos.map((r: any) => ({
      jugador_id: r.jugador_id,
      puntos: ranking.find((x) => x.id === r.jugador_id)?.puntos ?? (Number(r.puntos) || 0),
      es_reemplazo: true,
      reemplaza_a: r.reemplaza_a_jugador_id,
    })),
  ].sort((a, b) => b.puntos - a.puntos);

  // ¿Cambió respecto de lo actual? (por conjunto de jugador_id y puntos)
  const sig = (arr: any[]) =>
    arr.map((x) => `${x.jugador_id}:${x.puntos}:${x.es_reemplazo ? 1 : 0}`).sort().join("|");
  const currentSorted = current.map((c: any) => ({ jugador_id: c.jugador_id, puntos: Number(c.puntos) || 0, es_reemplazo: c.es_reemplazo }));
  if (sig(finalSet) === sig(currentSorted)) return; // sin cambios

  await sql`DELETE FROM master_participantes WHERE master_id = ${masterId}`;
  for (let i = 0; i < finalSet.length; i++) {
    const f = finalSet[i];
    await sql`
      INSERT INTO master_participantes (master_id, jugador_id, seed, puntos, es_reemplazo, reemplaza_a_jugador_id)
      VALUES (${masterId}, ${f.jugador_id}, ${i + 1}, ${f.puntos}, ${f.es_reemplazo}, ${f.reemplaza_a})
    `;
  }
}

/** Fisher–Yates con crypto.randomInt (aleatoriedad real en el runtime). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sorteo: baraja los participantes, forma parejas al azar (pareja_numero = seed
 * 1..8), crea la llave de 8 equipos con byes y cablea las conexiones. Idempotente.
 */
export async function sortearMaster(masterId: number) {
  const participantes = await sql`
    SELECT id FROM master_participantes WHERE master_id = ${masterId} ORDER BY seed
  `;
  const ids = shuffle(participantes.map((p: any) => p.id as number));
  const numPairs = Math.min(8, Math.floor(ids.length / 2));

  // Reset de parejas y bracket anterior
  await sql`UPDATE master_participantes SET pareja_numero = NULL WHERE master_id = ${masterId}`;
  await sql`DELETE FROM master_llaves WHERE master_id = ${masterId}`;

  // Asignar pareja_numero (seed) a los dos jugadores de cada pareja
  for (let k = 0; k < numPairs; k++) {
    const a = ids[2 * k];
    const b = ids[2 * k + 1];
    await sql`UPDATE master_participantes SET pareja_numero = ${k + 1} WHERE id = ${a}`;
    await sql`UPDATE master_participantes SET pareja_numero = ${k + 1} WHERE id = ${b}`;
  }
  // (jugador impar sobrante queda como reserva con pareja_numero NULL)

  // Insertar partidos; team number > numPairs => null (no existe esa pareja)
  const idByKey: Record<string, number> = {};
  for (const m of BRACKET_8) {
    const e1 = m.e1 && m.e1 <= numPairs ? m.e1 : null;
    const e2 = m.e2 && m.e2 <= numPairs ? m.e2 : null;
    const rows = await sql`
      INSERT INTO master_llaves (master_id, ronda, posicion, equipo1_numero, equipo2_numero, estado, orden)
      VALUES (${masterId}, ${m.ronda}, ${m.posicion}, ${e1}, ${e2}, 'pendiente', ${m.posicion})
      RETURNING id
    `;
    idByKey[`${m.ronda}-${m.posicion}`] = rows[0].id;
  }

  // Cablear siguiente_llave_id / slot
  for (const [ro, po, rd, pd, slot] of WIRING) {
    const from = idByKey[`${ro}-${po}`];
    const to = idByKey[`${rd}-${pd}`];
    await sql`
      UPDATE master_llaves SET siguiente_llave_id = ${to}, siguiente_llave_slot = ${slot}
      WHERE id = ${from}
    `;
  }

  // Resolver byes en cuartos (un lado null y el otro presente => avanza directo)
  for (let pos = 1; pos <= 4; pos++) {
    const id = idByKey[`cuartos-${pos}`];
    const row = (await sql`SELECT * FROM master_llaves WHERE id = ${id}`)[0];
    const e1 = row.equipo1_numero;
    const e2 = row.equipo2_numero;
    if ((e1 == null) !== (e2 == null)) {
      const ganador = (e1 ?? e2) as number;
      await sql`UPDATE master_llaves SET ganador_numero = ${ganador}, estado = 'finalizado', updated_at = NOW() WHERE id = ${id}`;
      await propagarGanador(id);
    }
  }

  await sql`UPDATE masters SET estado = 'sorteado', updated_at = NOW() WHERE id = ${masterId} AND estado <> 'finalizado'`;
}

/** Calcula el ganador (número de equipo) a partir de los sets cargados. */
export function computeGanadorNumero(row: {
  equipo1_numero: number | null;
  equipo2_numero: number | null;
  set1_e1: number | null; set1_e2: number | null;
  set2_e1: number | null; set2_e2: number | null;
  set3_e1: number | null; set3_e2: number | null;
}): number | null {
  if (row.equipo1_numero == null || row.equipo2_numero == null) return null;
  const sets: Array<[number | null, number | null]> = [
    [row.set1_e1, row.set1_e2],
    [row.set2_e1, row.set2_e2],
    [row.set3_e1, row.set3_e2],
  ];
  let w1 = 0;
  let w2 = 0;
  for (const [a, b] of sets) {
    if (a == null || b == null) continue;
    if (a > b) w1++;
    else if (b > a) w2++;
  }
  if (w1 >= 2 && w1 > w2) return row.equipo1_numero;
  if (w2 >= 2 && w2 > w1) return row.equipo2_numero;
  return null;
}

/** Propaga el ganador de una llave a la siguiente (según siguiente_llave_id/slot). */
export async function propagarGanador(llaveId: number) {
  const row = (await sql`SELECT * FROM master_llaves WHERE id = ${llaveId}`)[0];
  if (!row || row.ganador_numero == null || !row.siguiente_llave_id) return;
  const slot = row.siguiente_llave_slot === 2 ? 2 : 1;
  if (slot === 1) {
    await sql`UPDATE master_llaves SET equipo1_numero = ${row.ganador_numero}, updated_at = NOW() WHERE id = ${row.siguiente_llave_id}`;
  } else {
    await sql`UPDATE master_llaves SET equipo2_numero = ${row.ganador_numero}, updated_at = NOW() WHERE id = ${row.siguiente_llave_id}`;
  }
  // Si la siguiente quedó con un bye (el otro lado nunca llegará) no forzamos nada:
  // se resuelve cuando el otro semifinalista se defina o por carga manual.
}

/** Detalle completo (para admin y público). */
export async function getMasterDetail(masterId: number) {
  const masterRows = await sql`
    SELECT m.*, c.nombre AS categoria_nombre, c.orden_nivel
    FROM masters m JOIN categorias c ON c.id = m.categoria_id
    WHERE m.id = ${masterId}
  `;
  if (masterRows.length === 0) return null;

  const categoriaId = masterRows[0].categoria_id;
  const participantes = await sql`
    SELECT mp.*, j.nombre, j.apellido, j.localidad,
      (SELECT COUNT(DISTINCT pa.fecha_torneo_id)
       FROM participaciones pa
       WHERE pa.jugador_id = mp.jugador_id AND pa.categoria_id = ${categoriaId}) AS fechas_jugadas
    FROM master_participantes mp
    JOIN jugadores j ON j.id = mp.jugador_id
    WHERE mp.master_id = ${masterId}
    ORDER BY mp.seed ASC
  `;

  const llaves = await sql`
    SELECT * FROM master_llaves
    WHERE master_id = ${masterId}
    ORDER BY CASE ronda WHEN 'cuartos' THEN 1 WHEN 'semis' THEN 2 WHEN 'final' THEN 3 ELSE 9 END,
             COALESCE(orden, posicion), posicion
  `;

  return { master: masterRows[0], participantes, llaves };
}
