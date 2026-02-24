import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// PUT - Guardar resultado de partido
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zonaId: string; partidoId: string }> }
) {
  const { zonaId, partidoId } = await params;
  const body = await request.json();
  const { set1_p1, set1_p2, set2_p1, set2_p2, set3_p1, set3_p2 } = body;

  const safeInt = (val: any): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const n = parseInt(val);
    return isNaN(n) ? null : n;
  };

  try {
    const [partido] = await sql`
      SELECT * FROM partidos_zona WHERE id = ${parseInt(partidoId)}
    `;

    if (!partido) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    const s1p1 = safeInt(set1_p1);
    const s1p2 = safeInt(set1_p2);
    const s2p1 = safeInt(set2_p1);
    const s2p2 = safeInt(set2_p2);
    const s3p1 = safeInt(set3_p1);
    const s3p2 = safeInt(set3_p2);

    // Validar que los games no superen 7
    const allSets = [s1p1, s1p2, s2p1, s2p2, s3p1, s3p2];
    if (allSets.some(s => s !== null && (s < 0 || s > 7))) {
      return NextResponse.json({ error: "Los games por set no pueden superar 7" }, { status: 400 });
    }

    // Validar si el partido ya está definido en 2 sets
    if (s1p1 !== null && s1p2 !== null && s2p1 !== null && s2p2 !== null) {
      const getSetWinner = (p1: number, p2: number) => {
        if (p1 >= 6 && p1 - p2 >= 2) return 1;
        if (p1 === 7 && (p2 === 5 || p2 === 6)) return 1;
        if (p2 >= 6 && p2 - p1 >= 2) return 2;
        if (p2 === 7 && (p1 === 5 || p1 === 6)) return 2;
        return 0;
      };

      const w1 = getSetWinner(s1p1, s1p2);
      const w2 = getSetWinner(s2p1, s2p2);

      if (w1 !== 0 && w1 === w2) {
        if (s3p1 !== null || s3p2 !== null) {
           return NextResponse.json({ error: "El partido ya está definido en 2 sets. No se puede ingresar un 3er set." }, { status: 400 });
        }
      }
    }

    let setsP1 = 0;
    let setsP2 = 0;
    let gamesP1 = 0;
    let gamesP2 = 0;

    if (s1p1 !== null && s1p2 !== null) {
      gamesP1 += s1p1; gamesP2 += s1p2;
      if (s1p1 > s1p2) setsP1++; else if (s1p2 > s1p1) setsP2++;
    }
    if (s2p1 !== null && s2p2 !== null) {
      gamesP1 += s2p1; gamesP2 += s2p2;
      if (s2p1 > s2p2) setsP1++; else if (s2p2 > s2p1) setsP2++;
    }
    if (s3p1 !== null && s3p2 !== null) {
      gamesP1 += s3p1; gamesP2 += s3p2;
      if (s3p1 > s3p2) setsP1++; else if (s3p2 > s3p1) setsP2++;
    }

    const ganadorId = setsP1 > setsP2 ? partido.pareja1_id : (setsP2 > setsP1 ? partido.pareja2_id : null);
    const perdedorId = setsP1 > setsP2 ? partido.pareja2_id : (setsP2 > setsP1 ? partido.pareja1_id : null);

    await sql`
      UPDATE partidos_zona
      SET 
        set1_pareja1 = ${s1p1},
        set1_pareja2 = ${s1p2},
        set2_pareja1 = ${s2p1},
        set2_pareja2 = ${s2p2},
        set3_pareja1 = ${s3p1},
        set3_pareja2 = ${s3p2},
        ganador_id = ${ganadorId},
        estado = 'finalizado'
      WHERE id = ${parseInt(partidoId)}
    `;

    // Actualizar estadísticas de las parejas
    if (partido.pareja1_id) {
      await sql`
        UPDATE parejas_zona
        SET 
          partidos_ganados = partidos_ganados + ${setsP1 > setsP2 ? 1 : 0},
          partidos_perdidos = partidos_perdidos + ${setsP2 > setsP1 ? 1 : 0},
          sets_ganados = sets_ganados + ${setsP1},
          sets_perdidos = sets_perdidos + ${setsP2},
          games_ganados = games_ganados + ${gamesP1},
          games_perdidos = games_perdidos + ${gamesP2}
        WHERE zona_id = ${parseInt(zonaId)} AND pareja_id = ${partido.pareja1_id}
      `;
    }

    if (partido.pareja2_id) {
      await sql`
        UPDATE parejas_zona
        SET 
          partidos_ganados = partidos_ganados + ${setsP2 > setsP1 ? 1 : 0},
          partidos_perdidos = partidos_perdidos + ${setsP1 > setsP2 ? 1 : 0},
          sets_ganados = sets_ganados + ${setsP2},
          sets_perdidos = sets_perdidos + ${setsP1},
          games_ganados = games_ganados + ${gamesP2},
          games_perdidos = games_perdidos + ${gamesP1}
        WHERE zona_id = ${parseInt(zonaId)} AND pareja_id = ${partido.pareja2_id}
      `;
    }

    // Para zonas de 3 y 4: actualizar partidos dependientes
    const tipoPartido = partido.tipo_partido;
    
    if (tipoPartido === 'inicial' || tipoPartido === 'inicial_1' || tipoPartido === 'inicial_2') {
      // Buscar partidos que dependen de este resultado
      if (tipoPartido === 'inicial') {
        // Zona de 3: actualizar partido perdedor_vs_3 y ganador_vs_3
        await sql`
          UPDATE partidos_zona
          SET pareja1_id = ${perdedorId}
          WHERE zona_id = ${parseInt(zonaId)} AND tipo_partido = 'perdedor_vs_3'
        `;
        await sql`
          UPDATE partidos_zona
          SET pareja1_id = ${ganadorId}
          WHERE zona_id = ${parseInt(zonaId)} AND tipo_partido = 'ganador_vs_3'
        `;
      } else {
        // Zona de 4: verificar si ambos partidos iniciales terminaron
        const [otroInicial] = await sql`
          SELECT * FROM partidos_zona 
          WHERE zona_id = ${parseInt(zonaId)} 
            AND tipo_partido IN ('inicial_1', 'inicial_2')
            AND tipo_partido != ${tipoPartido}
            AND estado = 'finalizado'
        `;

        if (otroInicial) {
          // Ambos partidos iniciales terminaron, actualizar partidos de perdedores y ganadores
          const ganador1 = tipoPartido === 'inicial_1' ? ganadorId : otroInicial.ganador_id;
          const ganador2 = tipoPartido === 'inicial_2' ? ganadorId : otroInicial.ganador_id;
          const perdedor1 = tipoPartido === 'inicial_1' ? perdedorId : (otroInicial.pareja1_id === otroInicial.ganador_id ? otroInicial.pareja2_id : otroInicial.pareja1_id);
          const perdedor2 = tipoPartido === 'inicial_2' ? perdedorId : (otroInicial.pareja1_id === otroInicial.ganador_id ? otroInicial.pareja2_id : otroInicial.pareja1_id);

          await sql`
            UPDATE partidos_zona
            SET pareja1_id = ${perdedor1}, pareja2_id = ${perdedor2}
            WHERE zona_id = ${parseInt(zonaId)} AND tipo_partido = 'perdedores'
          `;
          await sql`
            UPDATE partidos_zona
            SET pareja1_id = ${ganador1}, pareja2_id = ${ganador2}
            WHERE zona_id = ${parseInt(zonaId)} AND tipo_partido = 'ganadores'
          `;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      ganador_id: ganadorId,
      resultado: { setsP1, setsP2, gamesP1, gamesP2 }
    });
  } catch (error) {
    console.error("Error saving resultado:", error);
    return NextResponse.json(
      { error: "Error al guardar resultado", details: String(error) },
      { status: 500 }
    );
  }
}
