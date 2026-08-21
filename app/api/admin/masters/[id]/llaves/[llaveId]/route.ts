import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { computeGanadorNumero } from "@/lib/masters";
import { NextResponse } from "next/server";

// PUT /api/admin/masters/[id]/llaves/[llaveId]
// Acepta campos de horario/orden y/o de resultado (sets). Si cambia el resultado,
// recalcula el ganador y lo propaga al siguiente partido.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; llaveId: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { llaveId } = await params;
  const body = await request.json();

  const current = (await sql`SELECT * FROM master_llaves WHERE id = ${Number(llaveId)}`)[0];
  if (!current) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  const pick = (key: string) => (body[key] === undefined ? current[key] : body[key]);

  const setKeys = ["set1_e1", "set1_e2", "set2_e1", "set2_e2", "set3_e1", "set3_e2"];
  const merged: any = {
    fecha_hora_programada: pick("fecha_hora_programada"),
    cancha_numero: pick("cancha_numero"),
    orden: pick("orden"),
  };
  for (const k of setKeys) merged[k] = pick(k);

  const touchedScore = setKeys.some((k) => body[k] !== undefined);

  // Recalcular ganador/estado si tocaron el resultado
  let ganador = current.ganador_numero;
  let estado = current.estado;
  if (touchedScore) {
    ganador = computeGanadorNumero({
      equipo1_numero: current.equipo1_numero,
      equipo2_numero: current.equipo2_numero,
      set1_e1: merged.set1_e1, set1_e2: merged.set1_e2,
      set2_e1: merged.set2_e1, set2_e2: merged.set2_e2,
      set3_e1: merged.set3_e1, set3_e2: merged.set3_e2,
    });
    estado = ganador != null ? "finalizado" : "pendiente";
  }

  await sql`
    UPDATE master_llaves SET
      fecha_hora_programada = ${merged.fecha_hora_programada},
      cancha_numero = ${merged.cancha_numero},
      orden = ${merged.orden},
      set1_e1 = ${merged.set1_e1}, set1_e2 = ${merged.set1_e2},
      set2_e1 = ${merged.set2_e1}, set2_e2 = ${merged.set2_e2},
      set3_e1 = ${merged.set3_e1}, set3_e2 = ${merged.set3_e2},
      ganador_numero = ${ganador},
      estado = ${estado},
      updated_at = NOW()
    WHERE id = ${Number(llaveId)}
  `;

  // Propagar (o limpiar) el ganador en el partido siguiente
  if (touchedScore && current.siguiente_llave_id) {
    const slot = current.siguiente_llave_slot === 2 ? 2 : 1;
    if (slot === 1) {
      await sql`UPDATE master_llaves SET equipo1_numero = ${ganador}, updated_at = NOW() WHERE id = ${current.siguiente_llave_id}`;
    } else {
      await sql`UPDATE master_llaves SET equipo2_numero = ${ganador}, updated_at = NOW() WHERE id = ${current.siguiente_llave_id}`;
    }
  }

  return NextResponse.json({ success: true, ganador_numero: ganador });
}
