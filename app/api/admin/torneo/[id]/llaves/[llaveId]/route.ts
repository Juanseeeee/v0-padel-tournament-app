import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { BRACKET_CONFIGS, RONDAS_ORDER } from "@/lib/bracket-config";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; llaveId: string }> }
) {
  const { llaveId } = await params;
  const body = await request.json();
  const { set1_p1, set1_p2, set2_p1, set2_p2, set3_p1, set3_p2 } = body;

  const safeInt = (val: any): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const n = parseInt(val);
    return isNaN(n) ? null : n;
  };

  try {
    const llave = await sql`SELECT * FROM llaves WHERE id = ${parseInt(llaveId)}`;
    if (llave.length === 0) {
      return NextResponse.json({ error: "Llave no encontrada" }, { status: 404 });
    }

    const l = llave[0];

    if (!l.pareja1_id || !l.pareja2_id) {
      return NextResponse.json({ error: "La llave no tiene ambas parejas asignadas" }, { status: 400 });
    }

    const s1p1 = safeInt(set1_p1);
    const s1p2 = safeInt(set1_p2);
    const s2p1 = safeInt(set2_p1);
    const s2p2 = safeInt(set2_p2);
    const s3p1 = safeInt(set3_p1);
    const s3p2 = safeInt(set3_p2);

    // Validar max 7
    const allSets = [s1p1, s1p2, s2p1, s2p2, s3p1, s3p2];
    if (allSets.some(s => s !== null && (s < 0 || s > 7))) {
      return NextResponse.json({ error: "Los games por set no pueden superar 7" }, { status: 400 });
    }

    // Determinar ganador
    let setsP1 = 0;
    let setsP2 = 0;

    if (s1p1 !== null && s1p2 !== null) {
      if (s1p1 > s1p2) setsP1++; else if (s1p2 > s1p1) setsP2++;
    }
    if (s2p1 !== null && s2p2 !== null) {
      if (s2p1 > s2p2) setsP1++; else if (s2p2 > s2p1) setsP2++;
    }
    if (s3p1 !== null && s3p2 !== null) {
      if (s3p1 > s3p2) setsP1++; else if (s3p2 > s3p1) setsP2++;
    }

    const ganador_id = setsP1 > setsP2 ? l.pareja1_id : setsP2 > setsP1 ? l.pareja2_id : null;
    const estado = ganador_id !== null ? 'finalizado' : 'pendiente';

    await sql`
      UPDATE llaves SET
        set1_pareja1 = ${s1p1},
        set1_pareja2 = ${s1p2},
        set2_pareja1 = ${s2p1},
        set2_pareja2 = ${s2p2},
        set3_pareja1 = ${s3p1},
        set3_pareja2 = ${s3p2},
        ganador_id = ${ganador_id},
        estado = ${estado}
      WHERE id = ${parseInt(llaveId)}
    `;

    // Propagar ganador a la siguiente ronda usando la topología del bracket config
    if (ganador_id) {
      // Obtener total de parejas para cargar el config correcto
      const parejasCount = await sql`
        SELECT COUNT(*) as total FROM parejas_torneo
        WHERE fecha_torneo_id = ${l.fecha_torneo_id} AND categoria_id = ${l.categoria_id}
      `;
      const totalParejas = parseInt(parejasCount[0].total);
      const config = BRACKET_CONFIGS[totalParejas];

      if (config) {
        // Encontrar la posición de esta llave en el bracket config
        const thisMatch = config.bracket.find(
          m => m.ronda === l.ronda && m.posicion === l.posicion
        );

        if (thisMatch) {
          // Encontrar el índice de esta llave en el bracket
          const thisIdx = config.bracket.indexOf(thisMatch);
          
          // Buscar en el bracket cuál llave de ronda posterior tiene un slot null
          // que corresponde a esta llave. La lógica es:
          // Recorremos las llaves de rondas posteriores y buscamos qué slots null
          // se alimentan desde esta ronda+posicion.
          
          const thisRondaIdx = RONDAS_ORDER.indexOf(l.ronda);
          
          // Buscar qué slot null en las rondas posteriores le toca a este ganador
          // Para esto, recorremos las llaves de la ronda siguiente y determinamos
          // cuáles slots null se llenan con ganadores de la ronda actual.
          
          // Obtenemos todas las llaves de la ronda actual en orden de posición
          const llavesRondaActual = config.bracket
            .filter(m => m.ronda === l.ronda)
            .sort((a, b) => a.posicion - b.posicion);
          
          // El índice de esta llave dentro de su ronda
          const idxEnRonda = llavesRondaActual.findIndex(
            m => m.posicion === l.posicion
          );
          
          // Buscar la siguiente ronda
          const siguienteRonda = thisRondaIdx + 1 < RONDAS_ORDER.length 
            ? RONDAS_ORDER[thisRondaIdx + 1] 
            : null;
          
          if (siguienteRonda) {
            // Llaves de la siguiente ronda
            const llavesSiguienteRonda = config.bracket
              .filter(m => m.ronda === siguienteRonda)
              .sort((a, b) => a.posicion - b.posicion);
            
            // Contar cuántos slots null hay en la siguiente ronda y mapearlos
            // a las llaves de la ronda actual.
            // Los slots null se llenan en orden: el primer null se llena con
            // el ganador de la primera llave de la ronda actual, el segundo null
            // con el segundo ganador, etc.
            let nullSlotCounter = 0;
            
            for (const nextMatch of llavesSiguienteRonda) {
              // Revisar p1
              if (nextMatch.p1 === null) {
                if (nullSlotCounter === idxEnRonda) {
                  // Este es el slot que corresponde a nuestro ganador
                  await sql`
                    UPDATE llaves SET pareja1_id = ${ganador_id}
                    WHERE fecha_torneo_id = ${l.fecha_torneo_id}
                      AND categoria_id = ${l.categoria_id}
                      AND ronda = ${siguienteRonda}
                      AND posicion = ${nextMatch.posicion}
                  `;
                  break;
                }
                nullSlotCounter++;
              }
              // Revisar p2
              if (nextMatch.p2 === null) {
                if (nullSlotCounter === idxEnRonda) {
                  await sql`
                    UPDATE llaves SET pareja2_id = ${ganador_id}
                    WHERE fecha_torneo_id = ${l.fecha_torneo_id}
                      AND categoria_id = ${l.categoria_id}
                      AND ronda = ${siguienteRonda}
                      AND posicion = ${nextMatch.posicion}
                  `;
                  break;
                }
                nullSlotCounter++;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating llave:", error);
    return NextResponse.json({ error: "Error al actualizar llave" }, { status: 500 });
  }
}
