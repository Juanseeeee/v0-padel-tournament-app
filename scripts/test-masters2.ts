import { config } from "dotenv";
config({ path: ".env.local" });
const TEMPORADA = 9998;

async function main() {
  const { sql } = await import("@/lib/db");
  const { getTop8, getCategoriaAptitud, reconcileParticipantes, getMasterDetail } = await import("@/lib/masters");

  const cat = (await sql`
    SELECT c.id, c.nombre, COUNT(*) AS n FROM categorias c
    JOIN jugador_categorias jc ON jc.categoria_id=c.id
    JOIN jugadores j ON j.id=jc.jugador_id AND j.estado='activo'
    JOIN puntos_categoria pc ON pc.jugador_id=j.id AND pc.categoria_id=c.id AND pc.puntos_acumulados>0
    GROUP BY c.id,c.nombre ORDER BY n DESC LIMIT 1`)[0] as any;

  await sql`DELETE FROM masters WHERE temporada=${TEMPORADA}`;
  const m = (await sql`INSERT INTO masters (categoria_id,temporada,nombre,estado) VALUES (${cat.id},${TEMPORADA},'T2','borrador') RETURNING id`)[0] as any;
  const top = await getTop8(cat.id);
  for (let i=0;i<top.length;i++) await sql`INSERT INTO master_participantes (master_id,jugador_id,seed,puntos) VALUES (${m.id},${(top[i] as any).id},${i+1},${Number((top[i] as any).puntos)||0})`;

  // 1) Aptitud
  const apt = await getCategoriaAptitud(cat.id);
  console.log(`getCategoriaAptitud: ${apt.length} jugadores; ejemplo:`, {
    nombre: apt[0].nombre, puntos: apt[0].puntos, fechas: `${apt[0].fechas_jugadas}/${apt[0].fechas_totales}`,
    dos_de_3: apt[0].jugo_2_de_ultimas_3, p60: apt[0].jugo_60pct,
  });

  // 2) Detalle con fechas_jugadas
  let det = await getMasterDetail(m.id);
  console.log(`participantes con fechas_jugadas: ${det!.participantes.every((p:any)=>p.fechas_jugadas!=null) ? "SÍ ✓" : "NO ✗"} (ej: ${det!.participantes[0].nombre} = ${det!.participantes[0].fechas_jugadas} fechas)`);

  // 3) Reemplazo + reconcile preserva
  const sale = det!.participantes[det!.participantes.length - 1]; // último clasificado
  const entra = apt.find(a => !det!.participantes.some((p:any)=>p.jugador_id===a.id))!; // primero fuera del top8
  await sql`UPDATE master_participantes SET jugador_id=${entra.id}, es_reemplazo=true, reemplaza_a_jugador_id=${sale.jugador_id} WHERE id=${sale.id}`;
  console.log(`Reemplazo: sale ${sale.nombre} ${sale.apellido}, entra ${entra.nombre} ${entra.apellido}`);
  await reconcileParticipantes(m.id);
  det = await getMasterDetail(m.id);
  const entraPresente = det!.participantes.some((p:any)=>p.jugador_id===entra.id && p.es_reemplazo);
  const salteAusente = !det!.participantes.some((p:any)=>p.jugador_id===sale.jugador_id);
  console.log(`Tras reconcile: entra preservado=${entraPresente?"SÍ ✓":"NO ✗"}, sale excluido=${salteAusente?"SÍ ✓":"NO ✗"}, total=${det!.participantes.length}`);

  await sql`DELETE FROM masters WHERE id=${m.id}`;
  console.log("Limpio. OK.");
}
main().catch(e=>{console.error(e);process.exit(1);});
