import { sql } from "./db";

export async function auditarLlaves(torneoId: number, categoriaId?: number) {
  // 1. Obtener todas las llaves del torneo
  const queryLlaves = categoriaId 
    ? sql`SELECT id, ronda, posicion, pareja1_id, pareja2_id, p1_seed, p2_seed FROM llaves WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoriaId}`
    : sql`SELECT id, ronda, posicion, pareja1_id, pareja2_id, p1_seed, p2_seed FROM llaves WHERE fecha_torneo_id = ${torneoId}`;
  
  const llaves = await queryLlaves;

  // 2. Obtener todas las posiciones finales de las zonas
  const queryPosiciones = categoriaId
    ? sql`
      SELECT 
        pz.pareja_id, pz.posicion_final, z.nombre as zona_nombre, pt.jugador1_id, pt.jugador2_id, j1.apellido as j1_apellido, j2.apellido as j2_apellido
      FROM parejas_zona pz
      JOIN zonas z ON z.id = pz.zona_id
      JOIN parejas_torneo pt ON pt.id = pz.pareja_id
      JOIN jugadores j1 ON j1.id = pt.jugador1_id
      JOIN jugadores j2 ON j2.id = pt.jugador2_id
      WHERE z.fecha_torneo_id = ${torneoId} AND z.categoria_id = ${categoriaId}
    `
    : sql`
      SELECT 
        pz.pareja_id, pz.posicion_final, z.nombre as zona_nombre, pt.jugador1_id, pt.jugador2_id, j1.apellido as j1_apellido, j2.apellido as j2_apellido
      FROM parejas_zona pz
      JOIN zonas z ON z.id = pz.zona_id
      JOIN parejas_torneo pt ON pt.id = pz.pareja_id
      JOIN jugadores j1 ON j1.id = pt.jugador1_id
      JOIN jugadores j2 ON j2.id = pt.jugador2_id
      WHERE z.fecha_torneo_id = ${torneoId}
    `;

  const posiciones = await queryPosiciones;

  const logs: string[] = [];
  const inconsistencias: any[] = [];
  let isValido = true;

  logs.push(`Iniciando auditoría de llaves para el torneo ID ${torneoId}`);
  logs.push(`Se encontraron ${llaves.length} partidos en llaves y ${posiciones.length} parejas en zonas.`);

  const posicionesMap = new Map<string, any>();
  for (const pos of posiciones) {
    if (pos.posicion_final) {
      const letra = pos.zona_nombre.replace('Zona ', '');
      const seed = `${pos.posicion_final}${letra}`;
      posicionesMap.set(seed, pos);
    }
  }

  for (const llave of llaves) {
    if (llave.p1_seed && !llave.p1_seed.includes('Ganador')) {
      const expectedPareja = posicionesMap.get(llave.p1_seed);
      if (expectedPareja) {
        if (llave.pareja1_id !== expectedPareja.pareja_id) {
          isValido = false;
          const errorMsg = `Discrepancia en Llave ${llave.ronda} (Pos ${llave.posicion}): El Seed ${llave.p1_seed} debería ser la pareja ${expectedPareja.j1_apellido}/${expectedPareja.j2_apellido} (ID: ${expectedPareja.pareja_id}) pero se encontró la pareja ID ${llave.pareja1_id}.`;
          logs.push(`[ERROR] ` + errorMsg);
          inconsistencias.push({ llave_id: llave.id, seed: llave.p1_seed, expected_pareja_id: expectedPareja.pareja_id, actual_pareja_id: llave.pareja1_id, mensaje: errorMsg });
        } else {
          logs.push(`[OK] Llave ${llave.ronda} Pos ${llave.posicion}: Pareja 1 correcta para el Seed ${llave.p1_seed}.`);
        }
      } else {
        logs.push(`[WARN] No se encontró pareja para el Seed ${llave.p1_seed} en las zonas.`);
      }
    }

    if (llave.p2_seed && !llave.p2_seed.includes('Ganador')) {
      const expectedPareja = posicionesMap.get(llave.p2_seed);
      if (expectedPareja) {
        if (llave.pareja2_id !== expectedPareja.pareja_id) {
          isValido = false;
          const errorMsg = `Discrepancia en Llave ${llave.ronda} (Pos ${llave.posicion}): El Seed ${llave.p2_seed} debería ser la pareja ${expectedPareja.j1_apellido}/${expectedPareja.j2_apellido} (ID: ${expectedPareja.pareja_id}) pero se encontró la pareja ID ${llave.pareja2_id}.`;
          logs.push(`[ERROR] ` + errorMsg);
          inconsistencias.push({ llave_id: llave.id, seed: llave.p2_seed, expected_pareja_id: expectedPareja.pareja_id, actual_pareja_id: llave.pareja2_id, mensaje: errorMsg });
        } else {
          logs.push(`[OK] Llave ${llave.ronda} Pos ${llave.posicion}: Pareja 2 correcta para el Seed ${llave.p2_seed}.`);
        }
      } else {
        logs.push(`[WARN] No se encontró pareja para el Seed ${llave.p2_seed} en las zonas.`);
      }
    }
  }

  logs.push(isValido ? `Auditoría finalizada con éxito. Las llaves son consistentes con los resultados de zona.` : `Auditoría fallida. Se encontraron ${inconsistencias.length} inconsistencias críticas.`);

  return { isValido, logs, inconsistencias };
}