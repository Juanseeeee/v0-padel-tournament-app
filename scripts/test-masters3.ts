import { config } from "dotenv";
config({ path: ".env.local" });
const TEMP = 9999;

async function main() {
  const { sql } = await import("@/lib/db");
  const { getTop8, iniciarSorteoManual, asignarJugadorPareja, getMasterDetail } = await import("@/lib/masters");
  const { parseDateOnly } = await import("@/lib/utils");

  const cat = (await sql`
    SELECT c.id FROM categorias c JOIN jugador_categorias jc ON jc.categoria_id=c.id
    JOIN jugadores j ON j.id=jc.jugador_id AND j.estado='activo'
    JOIN puntos_categoria pc ON pc.jugador_id=j.id AND pc.categoria_id=c.id AND pc.puntos_acumulados>0
    GROUP BY c.id ORDER BY COUNT(*) DESC LIMIT 1`)[0] as any;

  await sql`DELETE FROM masters WHERE temporada=${TEMP}`;
  const m = (await sql`INSERT INTO masters (categoria_id,temporada,nombre,estado) VALUES (${cat.id},${TEMP},'T3','borrador') RETURNING id`)[0] as any;
  const top = await getTop8(cat.id);
  for (let i = 0; i < top.length; i++) await sql`INSERT INTO master_participantes (master_id,jugador_id,seed,puntos) VALUES (${m.id},${(top[i] as any).id},${i + 1},0)`;

  // 1) FECHA como texto (sin corrimiento de TZ) + SEDE
  await sql`UPDATE masters SET fecha_evento='2026-11-12', sede='EL CANDIL PADEL (ARRIBEÑOS)' WHERE id=${m.id}`;
  let det = await getMasterDetail(m.id);
  console.log("fecha_evento devuelto:", JSON.stringify(det!.master.fecha_evento), "(tipo", typeof det!.master.fecha_evento + ")");
  console.log("  parseDateOnly →", parseDateOnly(det!.master.fecha_evento).toLocaleDateString("es-AR", { day: "numeric", month: "long" }), "(debe ser 12 de noviembre)");
  console.log("sede devuelta:", JSON.stringify(det!.master.sede));

  // 2) SORTEO EN VIVO: llave vacía con cajas fijas
  await iniciarSorteoManual(m.id);
  det = await getMasterDetail(m.id);
  console.log("\nLlave tras iniciar sorteo en vivo:");
  for (const l of det!.llaves as any[]) console.log(`  ${l.ronda}#${l.posicion}  e1=${l.equipo1_numero} e2=${l.equipo2_numero} -> sig=${l.siguiente_llave_id}(${l.siguiente_llave_slot})`);
  const sinAsignar = (det!.participantes as any[]).filter(p => p.pareja_numero == null).length;
  console.log("participantes sin asignar:", sinAsignar, "(debe ser 8)");

  // 3) ASIGNAR jugadores a cajas + tope de 2
  const ps = (det!.participantes as any[]).map(p => p.jugador_id);
  await asignarJugadorPareja(m.id, ps[0], 1);
  await asignarJugadorPareja(m.id, ps[1], 1);
  let err = "";
  try { await asignarJugadorPareja(m.id, ps[2], 1); } catch (e: any) { err = e.message; }
  console.log("\nTras poner 2 en caja 1, 3º rechazado:", err ? "SÍ ✓ (" + err + ")" : "NO ✗");
  await asignarJugadorPareja(m.id, ps[2], 2);
  det = await getMasterDetail(m.id);
  const caja1 = (det!.participantes as any[]).filter(p => p.pareja_numero === 1).map(p => p.nombre + " " + p.apellido);
  console.log("Caja 1:", caja1.join(" / "));
  // quitar
  await asignarJugadorPareja(m.id, ps[0], null);
  det = await getMasterDetail(m.id);
  console.log("Caja 1 tras quitar uno:", (det!.participantes as any[]).filter(p => p.pareja_numero === 1).length, "(debe ser 1)");

  await sql`DELETE FROM masters WHERE id=${m.id}`;
  console.log("\nLimpio. OK.");
}
main().catch((e) => { console.error(e); process.exit(1); });
