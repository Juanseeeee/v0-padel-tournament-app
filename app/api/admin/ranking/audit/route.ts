import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await requireAuth("admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { categoria_id } = await request.json();
    if (!categoria_id) {
      return NextResponse.json({ error: "Categoría requerida" }, { status: 400 });
    }

    // 1. Get Points Configuration
    const puntosConfig = await sql`SELECT * FROM puntos_configuracion ORDER BY orden ASC`;
    const puntosMap: Record<string, number> = {};
    puntosConfig.forEach((pc: any) => {
      puntosMap[pc.instancia] = pc.puntos;
    });

    // 2. Get Finished Tournaments for Category
    const torneos = await sql`
      SELECT id, numero_fecha, estado 
      FROM fechas_torneo 
      WHERE categoria_id = ${categoria_id} AND estado = 'finalizada'
    `;

    const expectedPoints: Record<number, { total: number; details: string[] }> = {};

    for (const torneo of torneos) {
      // Get Bracket Results (Llaves)
      const llaves = await sql`
        SELECT * FROM llaves 
        WHERE fecha_torneo_id = ${torneo.id} AND categoria_id = ${categoria_id}
      `;

      const resultadosParejas = new Map<number, string>(); // parejaId -> instancia

      // Final
      const final = llaves.find((l: any) => l.ronda === "final");
      if (final && final.estado === "finalizado" && final.ganador_id) {
          resultadosParejas.set(final.ganador_id, "campeon");
          const sub = final.pareja1_id === final.ganador_id ? final.pareja2_id : final.pareja1_id;
          if (sub) resultadosParejas.set(sub, "finalista");
      }

      // Semis
      const semis = llaves.filter((l: any) => l.ronda === "semifinal" && l.estado === "finalizado");
      for (const s of semis) {
          if (s.ganador_id) {
              const perdedor = s.pareja1_id === s.ganador_id ? s.pareja2_id : s.pareja1_id;
              if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "semifinalista");
          }
      }

      // 4tos
      const cuartos = llaves.filter((l: any) => l.ronda === "4tos" && l.estado === "finalizado");
      for (const c of cuartos) {
          if (c.ganador_id) {
              const perdedor = c.pareja1_id === c.ganador_id ? c.pareja2_id : c.pareja1_id;
              if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "cuartofinalista");
          }
      }

      // 8vos
      const octavos = llaves.filter((l: any) => l.ronda === "8vos" && l.estado === "finalizado");
      for (const o of octavos) {
          if (o.ganador_id) {
              const perdedor = o.pareja1_id === o.ganador_id ? o.pareja2_id : o.pareja1_id;
              if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "octavofinalista");
          }
      }

      // 16avos
      const dieciseisavos = llaves.filter((l: any) => l.ronda === "16avos" && l.estado === "finalizado");
      for (const d of dieciseisavos) {
          if (d.ganador_id) {
              const perdedor = d.pareja1_id === d.ganador_id ? d.pareja2_id : d.pareja1_id;
              if (perdedor && !resultadosParejas.has(perdedor)) resultadosParejas.set(perdedor, "16avos");
          }
      }

      // Zona (All couples not yet assigned a result)
      const allCouples = await sql`
          SELECT id, jugador1_id, jugador2_id FROM parejas_torneo 
          WHERE fecha_torneo_id = ${torneo.id} AND categoria_id = ${categoria_id}
      `;
      
      for (const p of allCouples) {
          if (!resultadosParejas.has(p.id)) {
              resultadosParejas.set(p.id, "zona");
          }
      }

      // Assign points to players
      for (const [parejaId, instancia] of resultadosParejas) {
          const puntos = puntosMap[instancia] || 0;
          const pareja = allCouples.find((p: any) => p.id === parejaId);
          if (pareja) {
              [pareja.jugador1_id, pareja.jugador2_id].forEach((pid: number) => {
                  if (!expectedPoints[pid]) expectedPoints[pid] = { total: 0, details: [] };
                  expectedPoints[pid].total += puntos;
                  expectedPoints[pid].details.push(`T${torneo.id}: ${instancia} (${puntos})`);
              });
          }
      }
    }

    // 3. Get Actual Points from DB
    const actualPoints = await sql`
      SELECT pc.jugador_id, pc.puntos_acumulados, j.nombre, j.apellido
      FROM puntos_categoria pc
      JOIN jugadores j ON j.id = pc.jugador_id
      WHERE pc.categoria_id = ${categoria_id}
    `;

    const discrepancies = [];

    // Check Actual vs Expected
    for (const actual of actualPoints) {
      const pid = actual.jugador_id;
      const exp = expectedPoints[pid] ? expectedPoints[pid].total : 0;
      const act = actual.puntos_acumulados;

      if (exp !== act) {
          discrepancies.push({
              jugador_id: pid,
              nombre: `${actual.nombre} ${actual.apellido}`,
              esperado: exp,
              actual: act,
              diferencia: act - exp,
              detalles: expectedPoints[pid]?.details || []
          });
      }
    }

    // Check Missing in Actual
    for (const pidStr of Object.keys(expectedPoints)) {
        const pid = Number(pidStr);
        if (!actualPoints.find((a: any) => a.jugador_id === pid)) {
            const exp = expectedPoints[pid];
            // Get player name
            const player = await sql`SELECT nombre, apellido FROM jugadores WHERE id = ${pid}`;
            const nombre = player[0] ? `${player[0].nombre} ${player[0].apellido}` : `ID ${pid}`;
            
            discrepancies.push({
                jugador_id: pid,
                nombre: nombre,
                esperado: exp.total,
                actual: 0,
                diferencia: -exp.total,
                detalles: exp.details
            });
        }
    }

    return NextResponse.json({ discrepancies });

  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
