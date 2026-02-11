import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: torneoId } = await params;

  try {
    // Obtener datos del torneo
    const [torneo] = await sql`
      SELECT ft.*, c.nombre as categoria_nombre 
      FROM fechas_torneo ft
      LEFT JOIN categorias c ON c.id = ft.categoria_id
      WHERE ft.id = ${parseInt(torneoId)}
    `;

    if (!torneo) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    const categoriaId = torneo.categoria_id;
    if (!categoriaId) {
      return NextResponse.json({ error: "El torneo no tiene categoría" }, { status: 400 });
    }

    // Verificar que la final esté jugada
    const finalPendiente = await sql`
      SELECT id FROM llaves 
      WHERE fecha_torneo_id = ${parseInt(torneoId)} 
        AND categoria_id = ${categoriaId}
        AND ronda = 'final'
        AND estado != 'finalizado'
      LIMIT 1
    `;

    if (finalPendiente.length > 0) {
      return NextResponse.json(
        { error: "La final aún no se ha jugado" },
        { status: 400 }
      );
    }

    // Cargar configuración de puntos
    const puntosConfig = await sql`SELECT * FROM puntos_configuracion ORDER BY orden`;
    const getPuntos = (instancia: string): number => {
      const config = puntosConfig.find((p: any) => p.instancia === instancia);
      return config ? config.puntos : 0;
    };

    // Obtener todas las llaves finalizadas
    const llaves = await sql`
      SELECT l.*, 
        pt1.jugador1_id as p1_j1, pt1.jugador2_id as p1_j2,
        pt2.jugador1_id as p2_j1, pt2.jugador2_id as p2_j2
      FROM llaves l
      LEFT JOIN parejas_torneo pt1 ON pt1.id = l.pareja1_id
      LEFT JOIN parejas_torneo pt2 ON pt2.id = l.pareja2_id
      WHERE l.fecha_torneo_id = ${parseInt(torneoId)}
        AND l.categoria_id = ${categoriaId}
      ORDER BY 
        CASE l.ronda 
          WHEN 'final' THEN 5 
          WHEN 'semis' THEN 4 
          WHEN '4tos' THEN 3 
          WHEN '8vos' THEN 2 
          WHEN '16avos' THEN 1 
        END DESC
    `;

    // Map jugador_id -> instancia alcanzada (guardamos la mejor)
    const jugadorInstancia: Record<number, string> = {};

    const setInstancia = (jugadorId: number, instancia: string) => {
      if (!jugadorId) return;
      // Solo asignar si no tiene una instancia mejor ya
      if (!jugadorInstancia[jugadorId]) {
        jugadorInstancia[jugadorId] = instancia;
      }
    };

    // Procesar llaves de mayor a menor ronda
    for (const llave of llaves) {
      if (llave.estado !== 'finalizado') continue;

      const ganadorPareja = llave.ganador_id === llave.pareja1_id 
        ? { j1: llave.p1_j1, j2: llave.p1_j2 }
        : { j1: llave.p2_j1, j2: llave.p2_j2 };
      
      const perdedorPareja = llave.ganador_id === llave.pareja1_id
        ? { j1: llave.p2_j1, j2: llave.p2_j2 }
        : { j1: llave.p1_j1, j2: llave.p1_j2 };

      if (llave.ronda === 'final') {
        setInstancia(ganadorPareja.j1, 'campeon');
        setInstancia(ganadorPareja.j2, 'campeon');
        setInstancia(perdedorPareja.j1, 'finalista');
        setInstancia(perdedorPareja.j2, 'finalista');
      } else if (llave.ronda === 'semis') {
        setInstancia(perdedorPareja.j1, 'semifinalista');
        setInstancia(perdedorPareja.j2, 'semifinalista');
      } else if (llave.ronda === '4tos') {
        setInstancia(perdedorPareja.j1, 'cuartofinalista');
        setInstancia(perdedorPareja.j2, 'cuartofinalista');
      } else if (llave.ronda === '8vos') {
        setInstancia(perdedorPareja.j1, 'octavofinalista');
        setInstancia(perdedorPareja.j2, 'octavofinalista');
      } else if (llave.ronda === '16avos') {
        setInstancia(perdedorPareja.j1, '16avos');
        setInstancia(perdedorPareja.j2, '16avos');
      }
    }

    // Obtener parejas que no llegaron a llaves (eliminados en zona)
    const parejasZona = await sql`
      SELECT pz.pareja_id, pz.posicion_final, pt.jugador1_id, pt.jugador2_id,
        (SELECT COUNT(*) FROM parejas_zona pz2 WHERE pz2.zona_id = pz.zona_id) as total_parejas_zona
      FROM parejas_zona pz
      JOIN zonas z ON z.id = pz.zona_id
      JOIN parejas_torneo pt ON pt.id = pz.pareja_id
      WHERE z.fecha_torneo_id = ${parseInt(torneoId)}
        AND z.categoria_id = ${categoriaId}
    `;

    for (const pz of parejasZona) {
      const j1 = pz.jugador1_id;
      const j2 = pz.jugador2_id;
      const totalParejas = parseInt(pz.total_parejas_zona);
      const posicion = pz.posicion_final;

      // Solo asignar 'zona' si no clasificaron a llaves (no tienen instancia ya)
      if (!jugadorInstancia[j1]) {
        setInstancia(j1, 'zona');
        setInstancia(j2, 'zona');
      }
    }

    // Guardar participaciones y puntos
    let totalProcesados = 0;
    for (const [jugadorIdStr, instancia] of Object.entries(jugadorInstancia)) {
      const jugadorId = parseInt(jugadorIdStr);
      const puntos = getPuntos(instancia);

      // Crear o actualizar participación
      await sql`
        INSERT INTO participaciones (jugador_id, fecha_torneo_id, categoria_id, instancia_alcanzada, puntos_obtenidos)
        VALUES (${jugadorId}, ${parseInt(torneoId)}, ${categoriaId}, ${instancia}, ${puntos})
        ON CONFLICT (jugador_id, fecha_torneo_id, categoria_id) 
        DO UPDATE SET instancia_alcanzada = ${instancia}, puntos_obtenidos = ${puntos}
      `;

      // Actualizar puntos acumulados por categoría
      await sql`
        INSERT INTO puntos_categoria (jugador_id, categoria_id, puntos_acumulados, torneos_jugados)
        VALUES (${jugadorId}, ${categoriaId}, ${puntos}, 1)
        ON CONFLICT (jugador_id, categoria_id) 
        DO UPDATE SET 
          puntos_acumulados = puntos_categoria.puntos_acumulados + ${puntos},
          torneos_jugados = puntos_categoria.torneos_jugados + 1,
          mejor_resultado = CASE 
            WHEN puntos_categoria.mejor_resultado IS NULL THEN ${instancia}
            WHEN ${instancia} = 'campeon' THEN 'campeon'
            WHEN ${instancia} = 'finalista' AND puntos_categoria.mejor_resultado NOT IN ('campeon') THEN 'finalista'
            ELSE puntos_categoria.mejor_resultado
          END,
          updated_at = NOW()
      `;

      // Registrar en historial_puntos para tracking por fecha
      await sql`
        INSERT INTO historial_puntos (jugador_id, categoria_id, fecha_torneo_id, puntos_acumulados, motivo)
        VALUES (${jugadorId}, ${categoriaId}, ${parseInt(torneoId)}, ${puntos}, ${instancia})
        ON CONFLICT DO NOTHING
      `;

      totalProcesados++;
    }

    // Marcar torneo como finalizada
    await sql`
      UPDATE fechas_torneo SET estado = 'finalizada' WHERE id = ${parseInt(torneoId)}
    `;

    return NextResponse.json({ 
      success: true, 
      message: `Torneo cerrado. Se asignaron puntos a ${totalProcesados} jugadores en categoría ${torneo.categoria_nombre}.`,
      detalle: jugadorInstancia
    });

  } catch (error: any) {
    console.error("[v0] Error cerrando torneo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
