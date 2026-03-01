import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { parseDateOnly } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const torneoId = parseInt(id);

  try {
    // Obtener info del torneo
    const torneoResult = await sql`
      SELECT f.*, c.nombre as categoria_nombre, s.nombre as sede_nombre
      FROM fechas_torneo f
      LEFT JOIN categorias c ON c.id = f.categoria_id
      LEFT JOIN sedes s ON s.nombre = f.sede
      WHERE f.id = ${torneoId}
    `;
    const torneo = torneoResult[0];
    if (!torneo) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    // Obtener zonas con parejas y partidos
    const zonas = await sql`
      SELECT * FROM zonas WHERE fecha_torneo_id = ${torneoId} ORDER BY nombre
    `;

    const zonasData = [];
    for (const zona of zonas) {
      const parejas = await sql`
        SELECT pz.*, pt.numero_pareja, pt.cabeza_serie, pt.dia_preferido, pt.hora_disponible,
          j1.nombre as j1_nombre, j1.apellido as j1_apellido,
          j2.nombre as j2_nombre, j2.apellido as j2_apellido
        FROM parejas_zona pz
        JOIN parejas_torneo pt ON pt.id = pz.pareja_id
        JOIN jugadores j1 ON j1.id = pt.jugador1_id
        JOIN jugadores j2 ON j2.id = pt.jugador2_id
        WHERE pz.zona_id = ${zona.id}
        ORDER BY pz.posicion_final
      `;
      const partidos = await sql`
        SELECT * FROM partidos_zona WHERE zona_id = ${zona.id} ORDER BY orden_partido
      `;
      zonasData.push({ zona, parejas, partidos });
    }

    // Obtener llaves
    const llaves = await sql`
      SELECT l.*,
        j1a.nombre as j1a_nombre, j1a.apellido as j1a_apellido,
        j2a.nombre as j2a_nombre, j2a.apellido as j2a_apellido,
        j1b.nombre as j1b_nombre, j1b.apellido as j1b_apellido,
        j2b.nombre as j2b_nombre, j2b.apellido as j2b_apellido
      FROM llaves l
      LEFT JOIN parejas_torneo pt1 ON pt1.id = l.pareja1_id
      LEFT JOIN jugadores j1a ON j1a.id = pt1.jugador1_id
      LEFT JOIN jugadores j2a ON j2a.id = pt1.jugador2_id
      LEFT JOIN parejas_torneo pt2 ON pt2.id = l.pareja2_id
      LEFT JOIN jugadores j1b ON j1b.id = pt2.jugador1_id
      LEFT JOIN jugadores j2b ON j2b.id = pt2.jugador2_id
      WHERE l.fecha_torneo_id = ${torneoId}
      ORDER BY l.ronda, l.posicion
    `;

    // Helper functions
    const getNombrePareja = (parejaId: number | null) => {
      if (!parejaId) return "A definir";
      for (const zd of zonasData) {
        const p = zd.parejas.find((pp: any) => pp.pareja_id === parejaId);
        if (p) return `${p.j1_apellido} / ${p.j2_apellido}`;
      }
      return `Pareja ${parejaId}`;
    };

    const getTipoLabel = (tipo: string) => {
      const labels: Record<string, string> = {
        inicial: "Partido 1", perdedor_vs_3: "Partido 2", ganador_vs_3: "Partido 3",
        inicial_1: "Semi 1", inicial_2: "Semi 2", perdedores: "3er Puesto", ganadores: "Final",
      };
      return labels[tipo] || tipo;
    };

    const getDiaLabel = (dia: string | null) => {
      if (!dia) return "";
      return { viernes: "Viernes", sabado: "Sabado", domingo: "Domingo" }[dia] || dia;
    };

    const getRondaLabel = (ronda: string) => {
      const labels: Record<string, string> = {
        cuartos: "Cuartos de Final", semis: "Semifinales", semifinal: "Semifinales",
        final: "Final", tercer_puesto: "3er y 4to Puesto",
        "3er_puesto": "3er y 4to Puesto",
      };
      return labels[ronda] || ronda;
    };

    const fechaStr = torneo.fecha_calendario
      ? parseDateOnly(torneo.fecha_calendario).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";

    // --- BUILD ZONAS HTML ---
    let zonasHtml = "";
    for (const { zona, parejas, partidos } of zonasData) {
      let parejasRows = "";
      parejas.forEach((p: any, idx: number) => {
        parejasRows += `
          <tr>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e5e5;text-align:center;font-weight:bold;width:30px;">${idx + 1}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e5e5;">
              ${p.j1_nombre} ${p.j1_apellido} / ${p.j2_nombre} ${p.j2_apellido}
              ${p.cabeza_serie ? ' <span style="color:#888;font-size:10px;">(CS)</span>' : ""}
            </td>
          </tr>`;
      });

      let partidosRows = "";
      partidos.forEach((pt: any) => {
        const dia = getDiaLabel(pt.dia_partido);
        const hora = pt.fecha_hora_programada || "";
        const cancha = pt.cancha_numero ? `Cancha ${pt.cancha_numero}` : "";
        const schedule = [dia, hora ? `${hora}hs` : "", cancha].filter(Boolean).join(" - ");

        const resultado = pt.estado === "finalizado" && pt.set1_pareja1 != null
          ? `${pt.set1_pareja1}-${pt.set1_pareja2}` +
            (pt.set2_pareja1 != null ? ` / ${pt.set2_pareja1}-${pt.set2_pareja2}` : "") +
            (pt.set3_pareja1 != null ? ` / ${pt.set3_pareja1}-${pt.set3_pareja2}` : "")
          : "";

        partidosRows += `
          <tr>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;white-space:nowrap;color:#555;">
              <strong>${schedule}</strong>
            </td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;color:#888;">
              ${getTipoLabel(pt.tipo_partido)}
            </td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;">
              ${getNombrePareja(pt.pareja1_id)} vs ${getNombrePareja(pt.pareja2_id)}
            </td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;font-weight:bold;color:#333;">
              ${resultado}
            </td>
          </tr>`;
      });

      zonasHtml += `
        <div style="margin-bottom:20px;page-break-inside:avoid;">
          <div style="background:#1a1a2e;color:white;padding:8px 12px;border-radius:6px 6px 0 0;font-size:14px;font-weight:bold;">
            ${zona.nombre}
          </div>
          <div style="border:1px solid #ddd;border-top:none;border-radius:0 0 6px 6px;padding:12px;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
              <thead><tr style="background:#f5f5f5;">
                <th style="padding:4px 8px;text-align:center;font-size:11px;width:30px;">#</th>
                <th style="padding:4px 8px;text-align:left;font-size:11px;">Pareja</th>
              </tr></thead>
              <tbody>${parejasRows}</tbody>
            </table>
            <div style="font-size:12px;font-weight:bold;margin-bottom:6px;color:#333;">Fixture</div>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f5f5f5;">
                <th style="padding:4px 8px;text-align:left;font-size:10px;">Horario</th>
                <th style="padding:4px 8px;text-align:left;font-size:10px;">Tipo</th>
                <th style="padding:4px 8px;text-align:left;font-size:10px;">Enfrentamiento</th>
                <th style="padding:4px 8px;text-align:left;font-size:10px;">Resultado</th>
              </tr></thead>
              <tbody>${partidosRows}</tbody>
            </table>
          </div>
        </div>`;
    }

    // --- BUILD LLAVES HTML ---
    let llavesHtml = "";
    if (llaves.length > 0) {
      // Group by ronda
      const rondas = new Map<string, any[]>();
      const rondaOrder = ["cuartos", "semis", "semifinal", "final", "tercer_puesto", "3er_puesto"];
      for (const llave of llaves) {
        const r = llave.ronda;
        if (!rondas.has(r)) rondas.set(r, []);
        rondas.get(r)!.push(llave);
      }

      // Sort rondas by known order
      const sortedRondas = [...rondas.entries()].sort((a, b) => {
        const ia = rondaOrder.indexOf(a[0]);
        const ib = rondaOrder.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      let matchesHtml = "";
      for (const [ronda, matches] of sortedRondas) {
        matchesHtml += `
          <div style="margin-bottom:16px;">
            <div style="font-size:13px;font-weight:bold;color:#1a1a2e;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #1a1a2e;">
              ${getRondaLabel(ronda)}
            </div>`;

        for (const m of matches) {
          const p1Name = m.j1a_apellido && m.j2a_apellido
            ? `${m.j1a_nombre} ${m.j1a_apellido} / ${m.j2a_nombre} ${m.j2a_apellido}`
            : (m.p1_seed || "A definir");
          const p2Name = m.j1b_apellido && m.j2b_apellido
            ? `${m.j1b_nombre} ${m.j1b_apellido} / ${m.j2b_nombre} ${m.j2b_apellido}`
            : (m.p2_seed || "A definir");

          const isP1Winner = m.ganador_id && m.ganador_id === m.pareja1_id;
          const isP2Winner = m.ganador_id && m.ganador_id === m.pareja2_id;

          const resultado = m.estado === "finalizado" && m.set1_pareja1 != null
            ? `${m.set1_pareja1}-${m.set1_pareja2}` +
              (m.set2_pareja1 != null ? ` / ${m.set2_pareja1}-${m.set2_pareja2}` : "") +
              (m.set3_pareja1 != null ? ` / ${m.set3_pareja1}-${m.set3_pareja2}` : "")
            : "";

          matchesHtml += `
            <div style="border:1px solid #ddd;border-radius:6px;margin-bottom:8px;overflow:hidden;">
              <div style="display:flex;border-bottom:1px solid #eee;">
                <div style="flex:1;padding:8px 12px;font-size:12px;${isP1Winner ? "font-weight:bold;background:#e8f5e9;" : ""}">
                  ${p1Name}
                </div>
                <div style="width:80px;text-align:center;padding:8px;font-size:12px;font-weight:bold;border-left:1px solid #eee;">
                  ${resultado ? resultado.split(" / ").map(s => s.split("-")[0]).join(" / ") : "-"}
                </div>
              </div>
              <div style="display:flex;">
                <div style="flex:1;padding:8px 12px;font-size:12px;${isP2Winner ? "font-weight:bold;background:#e8f5e9;" : ""}">
                  ${p2Name}
                </div>
                <div style="width:80px;text-align:center;padding:8px;font-size:12px;font-weight:bold;border-left:1px solid #eee;">
                  ${resultado ? resultado.split(" / ").map(s => s.split("-")[1]).join(" / ") : "-"}
                </div>
              </div>
            </div>`;
        }
        matchesHtml += `</div>`;
      }

      llavesHtml = `
        <div style="page-break-before:always;margin-top:30px;">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="font-size:18px;color:#1a1a2e;margin-bottom:4px;">Llaves Eliminatorias</h2>
            <p style="font-size:11px;color:#888;">Las parejas que clasifican de cada zona pasan a las llaves</p>
          </div>
          ${matchesHtml}
        </div>`;
    }

    // --- FULL HTML ---
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fixture - Fecha ${torneo.numero_fecha} - ${torneo.categoria_nombre || ""}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #222; padding: 20px; max-width: 800px; margin: 0 auto; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="font-size:20px;margin-bottom:4px;">Liga de Padel - Fecha ${torneo.numero_fecha}</h1>
    <p style="font-size:13px;color:#666;">
      ${torneo.categoria_nombre || ""}${fechaStr ? ` | ${fechaStr}` : ""}${torneo.sede_nombre ? ` | ${torneo.sede_nombre}` : ""}
    </p>
    <p style="font-size:11px;color:#888;margin-top:4px;">
      Viernes ${torneo.hora_inicio_viernes || "18:00"}hs | Sabado ${torneo.hora_inicio_sabado || "18:00"}hs | ${torneo.duracion_partido_min || 60} min por partido
    </p>
  </div>

  <h2 style="font-size:16px;color:#1a1a2e;margin-bottom:12px;padding-bottom:4px;border-bottom:2px solid #1a1a2e;">Fase de Zonas</h2>
  ${zonasHtml}

  ${llavesHtml}

  <div style="margin-top:30px;text-align:center;font-size:10px;color:#aaa;">
    Generado automaticamente - Liga de Padel
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Error al generar PDF", details: String(error) }, { status: 500 });
  }
}
