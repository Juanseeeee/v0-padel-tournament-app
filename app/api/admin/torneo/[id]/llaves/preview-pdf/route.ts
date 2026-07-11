import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { parseDateOnly } from "@/lib/utils";
import { BRACKET_CONFIGS, RONDAS_ORDER, getPreviewBracketMatches } from "@/lib/bracket-config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const torneoId = parseInt(id);
  
  const searchParams = request.nextUrl.searchParams;
  const parejasStr = searchParams.get('parejas');
  const totalParejas = parejasStr ? parseInt(parejasStr) : 0;

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

    const config = BRACKET_CONFIGS[totalParejas];
    if (!config) {
      return NextResponse.json({ error: "No hay configuración de llaves para esta cantidad de parejas" }, { status: 400 });
    }
    const previewBracket = getPreviewBracketMatches(totalParejas, config.bracket);

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

    // Group by ronda based on RONDAS_ORDER
    const rondas = new Map<string, any[]>();
    for (const match of previewBracket) {
      const r = match.ronda;
      if (!rondas.has(r)) rondas.set(r, []);
      rondas.get(r)!.push(match);
    }

    // Sort rondas by RONDAS_ORDER
    const sortedRondas = [...rondas.entries()].sort((a, b) => {
      const ia = RONDAS_ORDER.indexOf(a[0]);
      const ib = RONDAS_ORDER.indexOf(b[0]);
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
        const p1Name = m.p1 || "Ganador anterior";
        const p2Name = m.p2 || "Ganador anterior";

        matchesHtml += `
          <div style="border:1px solid #ddd;border-radius:6px;margin-bottom:8px;overflow:hidden;page-break-inside:avoid; position:relative;">
            ${m.posicion ? `<div style="position:absolute; top:0; right:0; background:#1a1a2e; color:#fff; font-size:10px; padding:2px 6px; border-bottom-left-radius:6px;">#${m.posicion}</div>` : ''}
            <div style="display:flex;border-bottom:1px solid #eee;">
              <div style="flex:1;padding:8px 12px;font-size:12px;">
                ${p1Name}
              </div>
            </div>
            <div style="display:flex;">
              <div style="flex:1;padding:8px 12px;font-size:12px;">
                ${p2Name}
              </div>
            </div>
          </div>`;
      }
      matchesHtml += `</div>`;
    }

    llavesHtml = `
      <div style="margin-top:10px;">
        <div style="text-align:center;margin-bottom:20px;">
          <h2 style="font-size:18px;color:#1a1a2e;margin-bottom:4px;">Previsualización de Esquema de Cruces</h2>
          <p style="font-size:11px;color:#888;">Esquema estimado para ${totalParejas} parejas (${config.zonas.length} zonas: ${config.zonas.join(" + ")} parejas)</p>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          ${matchesHtml}
        </div>
      </div>`;

    // --- FULL HTML ---
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Esquema de Cruces - Fecha ${torneo.numero_fecha} - ${torneo.categoria_nombre || ""}</title>
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
