import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { BRACKET_CONFIGS, ZONA_LETTERS, parseSlot, RONDAS_ORDER } from "@/lib/bracket-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { categoria_id } = body;
  const torneoId = parseInt(id);

  try {
    // Verificar que no existan llaves
    const existingLlaves = await sql`
      SELECT id FROM llaves WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoria_id}
    `;

    if (existingLlaves.length > 0) {
      return NextResponse.json(
        { error: "Ya existen llaves para esta categoría" },
        { status: 400 }
      );
    }

    // Verificar que todas las zonas estén finalizadas
    const zonasIncompletas = await sql`
      SELECT z.id FROM zonas z
      WHERE z.fecha_torneo_id = ${torneoId} 
        AND z.categoria_id = ${categoria_id}
        AND z.estado != 'finalizada'
      LIMIT 1
    `;

    if (zonasIncompletas.length > 0) {
      return NextResponse.json(
        { error: "Hay zonas sin cerrar. Cierra todas las zonas antes de generar llaves." },
        { status: 400 }
      );
    }

    // Contar total de parejas del torneo para esta categoría
    const parejasCount = await sql`
      SELECT COUNT(*) as total FROM parejas_torneo
      WHERE fecha_torneo_id = ${torneoId} AND categoria_id = ${categoria_id}
    `;
    const totalParejas = parseInt(parejasCount[0].total);

    const config = BRACKET_CONFIGS[totalParejas];
    if (!config) {
      return NextResponse.json(
        { error: `No hay configuración de llaves para ${totalParejas} parejas. Soportado: 6-35.` },
        { status: 400 }
      );
    }

    // Obtener zonas con su nombre para mapear letra
    const zonas = await sql`
      SELECT z.id, z.nombre FROM zonas z
      WHERE z.fecha_torneo_id = ${torneoId} AND z.categoria_id = ${categoria_id}
      ORDER BY z.nombre ASC
    `;

    // Construir mapa: letra de zona -> zona_id
    // Las zonas se nombran "Zona A", "Zona B", etc.
    const zonaMap: Record<string, number> = {};
    for (const z of zonas) {
      const letra = z.nombre.replace('Zona ', '');
      zonaMap[letra] = z.id;
    }

    // Construir mapa: "1A" -> pareja_id (posición X en zona Y)
    const slotToPareja: Record<string, number> = {};
    
    for (const [letra, zonaId] of Object.entries(zonaMap)) {
      const parejasZona = await sql`
        SELECT pz.pareja_id, pz.posicion_final
        FROM parejas_zona pz
        WHERE pz.zona_id = ${zonaId}
        ORDER BY pz.posicion_final ASC
      `;

      for (const p of parejasZona) {
        const slot = `${p.posicion_final}${letra}`;
        slotToPareja[slot] = p.pareja_id;
      }
    }

    // Crear llaves según la configuración del bracket
    // Primero insertar todas las llaves
    const llaveDbIds: Record<string, number> = {}; // "ronda-posicion" -> db id

    for (const match of config.bracket) {
      const p1Id = match.p1 ? (slotToPareja[match.p1] || null) : null;
      const p2Id = match.p2 ? (slotToPareja[match.p2] || null) : null;

      const result = await sql`
        INSERT INTO llaves (
          fecha_torneo_id, categoria_id, ronda, posicion,
          pareja1_id, pareja2_id, p1_seed, p2_seed, estado
        )
        VALUES (
          ${torneoId}, ${categoria_id}, ${match.ronda}, ${match.posicion},
          ${p1Id}, ${p2Id}, ${match.p1 || null}, ${match.p2 || null}, 'pendiente'
        )
        RETURNING id
      `;

      llaveDbIds[`${match.ronda}-${match.posicion}`] = result[0].id;
    }

    // Establecer las conexiones entre llaves (siguiente_llave_id)
    // Esto permite mover partidos de 8vos a otros slots de 4tos si se desea
    for (const match of config.bracket) {
      const thisRondaIdx = RONDAS_ORDER.indexOf(match.ronda);
      const nextRonda = RONDAS_ORDER[thisRondaIdx + 1];
      
      if (!nextRonda) continue;

      // Obtener todas las llaves de la ronda actual ordenadas por posición
      const currentRoundMatches = config.bracket
        .filter(m => m.ronda === match.ronda)
        .sort((a, b) => a.posicion - b.posicion);
      
      const myIndex = currentRoundMatches.indexOf(match);
      if (myIndex === -1) continue;

      // Obtener llaves de la siguiente ronda
      const nextRoundMatches = config.bracket
        .filter(m => m.ronda === nextRonda)
        .sort((a, b) => a.posicion - b.posicion);

      // Buscar qué slot null corresponde a esta llave
      let nullSlotCounter = 0;
      let targetMatch = null;
      let targetSlot = null;

      for (const nextMatch of nextRoundMatches) {
        if (nextMatch.p1 === null) {
          if (nullSlotCounter === myIndex) {
            targetMatch = nextMatch;
            targetSlot = 1;
            break;
          }
          nullSlotCounter++;
        }
        if (nextMatch.p2 === null) {
          if (nullSlotCounter === myIndex) {
            targetMatch = nextMatch;
            targetSlot = 2;
            break;
          }
          nullSlotCounter++;
        }
      }

      if (targetMatch && targetSlot) {
        const sourceId = llaveDbIds[`${match.ronda}-${match.posicion}`];
        const targetId = llaveDbIds[`${targetMatch.ronda}-${targetMatch.posicion}`];

        if (sourceId && targetId) {
          await sql`
            UPDATE llaves 
            SET siguiente_llave_id = ${targetId}, siguiente_llave_slot = ${targetSlot}
            WHERE id = ${sourceId}
          `;
        }
      }
    }

    // Calcular cuántas rondas hay
    const rondasUsadas = [...new Set(config.bracket.map(m => m.ronda))];

    return NextResponse.json({ 
      success: true, 
      totalParejas,
      llaves: config.bracket.length,
      rondas: rondasUsadas
    });
  } catch (error: any) {
    console.error("Error generating llaves:", error?.message || error);
    return NextResponse.json(
      { error: "Error al generar llaves: " + (error?.message || "desconocido") }, 
      { status: 500 }
    );
  }
}
