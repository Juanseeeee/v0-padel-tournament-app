import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { parseDateOnly, parseDateTime } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const torneoId = parseInt(id);

  try {
    const formatLlaveScheduleTime = (value?: string | null) => {
      const parsed = parseDateTime(value);
      if (parsed) {
        return parsed.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }

      if (typeof value === "string") {
        const match = value.match(/(\d{1,2}:\d{2})/);
        if (match) return match[1].padStart(5, "0");
      }

      return "";
    };

    const getScheduleSummary = (llave: any) => {
      const parts: string[] = [];
      const hora = formatLlaveScheduleTime(llave.fecha_hora_programada);
      if (hora) parts.push(`DOM ${hora}hs`);
      if (llave.cancha_numero) parts.push(`Cancha ${llave.cancha_numero}`);
      return parts.join(" | ");
    };

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

    const getRondaLabel = (ronda: string) => {
      const labels: Record<string, string> = {
        "32avos": "32avos de Final",
        "16avos": "16avos de Final",
        "8vos": "Octavos de Final",
        "4tos": "Cuartos de Final",
        cuartos: "Cuartos de Final", semis: "Semifinales", semifinal: "Semifinales",
        final: "Final", tercer_puesto: "3er y 4to Puesto",
        "3er_puesto": "3er y 4to Puesto",
      };
      return labels[ronda] || ronda;
    };

    const fechaStr = torneo.fecha_calendario
      ? parseDateOnly(torneo.fecha_calendario).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";

    // --- BUILD LLAVES HTML ---
    let llavesHtml = "";
    if (llaves.length > 0) {
      // Group by ronda
      const rondas = new Map<string, any[]>();
      const rondaOrder = ["32avos", "16avos", "8vos", "4tos", "cuartos", "semis", "semifinal", "final", "tercer_puesto", "3er_puesto"];
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
            ? `${m.j1a_apellido} ${m.j1a_nombre?.charAt(0) || ""}. / ${m.j2a_apellido} ${m.j2a_nombre?.charAt(0) || ""}.`
            : (m.p1_seed || "A definir");
          const p2Name = m.j1b_apellido && m.j2b_apellido
            ? `${m.j1b_apellido} ${m.j1b_nombre?.charAt(0) || ""}. / ${m.j2b_apellido} ${m.j2b_nombre?.charAt(0) || ""}.`
            : (m.p2_seed || "A definir");

          const isP1Winner = m.ganador_id && m.ganador_id === m.pareja1_id;
          const isP2Winner = m.ganador_id && m.ganador_id === m.pareja2_id;

          const resultado = m.estado === "finalizado" && m.set1_pareja1 != null
            ? `${m.set1_pareja1}-${m.set1_pareja2}` +
              (m.set2_pareja1 != null ? ` / ${m.set2_pareja1}-${m.set2_pareja2}` : "") +
              (m.set3_pareja1 != null ? ` / ${m.set3_pareja1}-${m.set3_pareja2}` : "")
            : "";
          const scheduleSummary = getScheduleSummary(m);

          matchesHtml += `
            <div style="border:1px solid #ddd;border-radius:6px;margin-bottom:8px;overflow:hidden;page-break-inside:avoid;">
              ${scheduleSummary ? `
              <div style="padding:6px 12px;font-size:10px;font-weight:bold;color:#475569;background:#f8fafc;border-bottom:1px solid #eee;">
                ${scheduleSummary}
              </div>` : ""}
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
        <div style="margin-top:10px;">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="font-size:18px;color:#1a1a2e;margin-bottom:4px;">Llaves Eliminatorias</h2>
            <p style="font-size:11px;color:#888;">Las parejas que clasifican de cada zona pasan a las llaves</p>
          </div>
          ${matchesHtml}
        </div>`;
    } else {
        llavesHtml = '<div style="text-align:center;margin-top:40px;color:#888;font-size:14px;">No hay llaves generadas todavía</div>';
    }

    // --- FULL HTML ---
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Llaves - Fecha ${torneo.numero_fecha} - ${torneo.categoria_nombre || ""}</title>
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
