// Recalcula los puntos del torneo 183 (6TA MASC, EL CANDIL F7) tras la
// corrección de resultados. Idempotente. Muestra antes/después.
import { config } from "dotenv";
config({ path: ".env.local" });

const T = 183;
const CAT = 25;

async function main() {
  const { sql } = await import("@/lib/db");
  const { recalcularPuntosTorneo } = await import("@/lib/torneo-points");

  const nombres = ["ottoboni", "samana", "olguin", "muñoz"];
  const foco = await sql`
    SELECT id, nombre, apellido FROM jugadores
    WHERE apellido ILIKE '%ottoboni%' OR apellido ILIKE '%samana%' OR apellido ILIKE '%olguin%' OR apellido ILIKE '%encina%'
  `;

  async function snap(label: string) {
    console.log(`\n===== ${label} =====`);
    for (const j of foco as any[]) {
      const part = (await sql`SELECT instancia_alcanzada i, puntos_obtenidos p FROM participaciones WHERE jugador_id=${j.id} AND fecha_torneo_id=${T} AND categoria_id=${CAT}`)[0] as any;
      const pc = (await sql`SELECT puntos_acumulados t FROM puntos_categoria WHERE jugador_id=${j.id} AND categoria_id=${CAT}`)[0] as any;
      console.log(`  ${j.nombre} ${j.apellido}: participacion=${part ? part.i + "(" + part.p + ")" : "—"}  |  total 6TA=${pc?.t ?? 0}`);
    }
  }

  await snap("ANTES");
  console.log("\n>>> Recalculando torneo 183...");
  const res = await recalcularPuntosTorneo(T);
  console.log(`Procesados: ${res.procesados} jugadores (categoría ${res.categoriaId})`);
  await snap("DESPUÉS");
}
main().catch((e) => { console.error(e); process.exit(1); });
