import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function isTripleTie(stats: any[]): boolean {
  if (stats.length !== 3) return false;
  const wins = new Set(stats.map(s => Number(s.partidos_ganados || 0)));
  const setDiff = new Set(stats.map(s => Number((s.sets_ganados || 0) - (s.sets_perdidos || 0))));
  const gameDiff = new Set(stats.map(s => Number((s.games_ganados || 0) - (s.games_perdidos || 0))));
  return wins.size === 1 && setDiff.size === 1 && gameDiff.size === 1;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zonaId: string }> }
) {
  const { id, zonaId } = await params;
  const torneoId = parseInt(id);
  const zonaIdNum = parseInt(zonaId);
  const body = await request.json();
  const { metodo } = body as { metodo: "sorteo" | "tiebreak" };

  if (!metodo) {
    return NextResponse.json({ error: "Falta 'metodo' (sorteo|tiebreak)" }, { status: 400 });
  }

  try {
    const [zona] = await sql`SELECT id, estado FROM zonas WHERE id = ${zonaIdNum} AND fecha_torneo_id = ${torneoId}`;
    if (!zona) return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });

    const stats = await sql`
      SELECT pareja_id, partidos_ganados, sets_ganados, sets_perdidos, games_ganados, games_perdidos
      FROM parejas_zona
      WHERE zona_id = ${zonaIdNum}
      ORDER BY pareja_id
    `;

    if (stats.length !== 3) {
      return NextResponse.json({ error: "Resolver empate aplica solo a zonas de 3 parejas" }, { status: 400 });
    }

    // Verificar que todos los partidos de la zona estén finalizados
    const partidos = await sql`
      SELECT estado FROM partidos_zona WHERE zona_id = ${zonaIdNum}
    `;
    const allDone = partidos.length > 0 && partidos.every((p: any) => p.estado === "finalizado");
    if (!allDone) {
      return NextResponse.json({ error: "Aún hay partidos sin finalizar en la zona" }, { status: 400 });
    }

    // Confirmar que es un triple empate estadístico
    if (!isTripleTie(stats)) {
      return NextResponse.json({ error: "No hay triple empate estadístico para resolver" }, { status: 400 });
    }

    if (metodo === "sorteo") {
      // Orden aleatorio y asignar posiciones finales 1, 2, 3
      const shuffled = [...stats].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await sql`
          UPDATE parejas_zona
          SET posicion_final = ${i + 1}
          WHERE zona_id = ${zonaIdNum} AND pareja_id = ${shuffled[i].pareja_id}
        `;
      }
      await sql`UPDATE zonas SET estado = 'finalizada' WHERE id = ${zonaIdNum}`;
      return NextResponse.json({ success: true, metodo: "sorteo" });
    }

    if (metodo === "tiebreak") {
      // Crear partidos de tiebreak: partido 1 entre dos parejas al azar y partido 2 contra la tercera
      const order = [...stats].sort(() => Math.random() - 0.5);
      const a = order[0].pareja_id;
      const b = order[1].pareja_id;
      const c = order[2].pareja_id;

      const maxOrden = await sql`
        SELECT COALESCE(MAX(orden_partido), 0) as max_orden
        FROM partidos_zona
        WHERE zona_id = ${zonaIdNum}
      `;
      const startOrden = Number(maxOrden[0]?.max_orden || 0) + 1;

      await sql`
        INSERT INTO partidos_zona (
          zona_id, pareja1_id, pareja2_id, orden_partido, tipo_partido, estado,
          dia_partido, cancha_numero, fecha_hora_programada
        ) VALUES (
          ${zonaIdNum}, ${a}, ${b}, ${startOrden}, 'tiebreak_1', 'pendiente',
          NULL, NULL, NULL
        )
      `;
      await sql`
        INSERT INTO partidos_zona (
          zona_id, pareja1_id, pareja2_id, orden_partido, tipo_partido, estado,
          dia_partido, cancha_numero, fecha_hora_programada
        ) VALUES (
          ${zonaIdNum}, NULL, ${c}, ${startOrden + 1}, 'tiebreak_2', 'pendiente',
          NULL, NULL, NULL
        )
      `;

      // Dejar zona en juego para que se disputen los tiebreaks
      await sql`UPDATE zonas SET estado = 'en_juego' WHERE id = ${zonaIdNum}`;

      return NextResponse.json({ success: true, metodo: "tiebreak" });
    }

    return NextResponse.json({ error: "Metodo no soportado" }, { status: 400 });
  } catch (error) {
    console.error("Error resolviendo empate:", error);
    return NextResponse.json({ error: "Error resolviendo empate" }, { status: 500 });
  }
}
