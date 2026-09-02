// Test de integración del flujo Master (contra la DB real, con limpieza).
//   npx tsx scripts/test-masters.ts
import { config } from "dotenv";
config({ path: ".env.local" });

const TEMPORADA = 9999; // temporada de prueba, se borra al final

async function main() {
  const { sql } = await import("@/lib/db");
  const { getTop8, sortearMaster, getMasterDetail, computeGanadorNumero, propagarGanador } = await import("@/lib/masters");

  // Elegir una categoría con suficientes jugadores con puntos
  const cat = (await sql`
    SELECT c.id, c.nombre, COUNT(*) AS n
    FROM categorias c
    JOIN jugador_categorias jc ON jc.categoria_id = c.id
    JOIN jugadores j ON j.id = jc.jugador_id AND j.estado='activo'
    JOIN puntos_categoria pc ON pc.jugador_id=j.id AND pc.categoria_id=c.id AND pc.puntos_acumulados>0
    GROUP BY c.id, c.nombre ORDER BY n DESC LIMIT 1
  `)[0] as any;
  console.log(`Categoría de prueba: ${cat.nombre} (id=${cat.id}) con ${cat.n} jugadores con puntos`);

  // Limpiar cualquier master de prueba previo
  await sql`DELETE FROM masters WHERE temporada = ${TEMPORADA}`;

  // Crear master + snapshot top8
  const m = (await sql`
    INSERT INTO masters (categoria_id, temporada, nombre, estado)
    VALUES (${cat.id}, ${TEMPORADA}, ${'TEST Master'}, 'borrador') RETURNING id
  `)[0] as any;
  const masterId = m.id;
  const top = await getTop8(cat.id);
  for (let i = 0; i < top.length; i++) {
    await sql`INSERT INTO master_participantes (master_id, jugador_id, seed, puntos) VALUES (${masterId}, ${(top[i] as any).id}, ${i + 1}, ${Number((top[i] as any).puntos) || 0})`;
  }
  console.log(`Clasificados: ${top.length}`);

  // Sortear
  await sortearMaster(masterId);
  const detail = await getMasterDetail(masterId);
  const parts = detail!.participantes as any[];
  const llaves = detail!.llaves as any[];

  const parejas: Record<number, string[]> = {};
  for (const p of parts) {
    if (p.pareja_numero == null) continue;
    (parejas[p.pareja_numero] ||= []).push(`${p.nombre} ${p.apellido}`);
  }
  console.log("\nParejas sorteadas:");
  Object.entries(parejas).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([n, j]) => console.log(`  Pareja ${n}: ${j.join(" / ")}`));

  console.log("\nBracket:");
  for (const l of llaves) {
    console.log(`  ${l.ronda}#${l.posicion}  e1=${l.equipo1_numero} e2=${l.equipo2_numero}  estado=${l.estado} ganador=${l.ganador_numero}  -> sig=${l.siguiente_llave_id}(slot ${l.siguiente_llave_slot})`);
  }

  // Simular un resultado en una semi pendiente con ambos equipos
  const semi = llaves.find((l) => l.ronda === "semis" && l.equipo1_numero != null && l.equipo2_numero != null && l.estado === "pendiente");
  if (semi) {
    await sql`UPDATE master_llaves SET set1_e1=6, set1_e2=3, set2_e1=6, set2_e2=4 WHERE id=${semi.id}`;
    const row = (await sql`SELECT * FROM master_llaves WHERE id=${semi.id}`)[0] as any;
    const g = computeGanadorNumero(row);
    await sql`UPDATE master_llaves SET ganador_numero=${g}, estado='finalizado' WHERE id=${semi.id}`;
    await propagarGanador(semi.id);
    const sig = (await sql`SELECT * FROM master_llaves WHERE id=${semi.id}`)[0] as any;
    const next = (await sql`SELECT * FROM master_llaves WHERE id=${sig.siguiente_llave_id}`)[0] as any;
    console.log(`\nCargué semis#${semi.posicion}: ganó equipo ${g}. Final destino ahora: e1=${next.equipo1_numero} e2=${next.equipo2_numero}`);
    console.log(`Propagación correcta: ${next.equipo1_numero === g || next.equipo2_numero === g ? "SÍ ✓" : "NO ✗"}`);
  }

  // Limpiar
  await sql`DELETE FROM masters WHERE id = ${masterId}`;
  console.log("\nMaster de prueba eliminado. OK.");
}

main().catch((e) => { console.error(e); process.exit(1); });
