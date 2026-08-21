import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/admin/masters/[id]/reemplazar  { sale_jugador_id, entra_jugador_id }
// Sustituye un clasificado por un candidato (mantiene el mismo seed/slot).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("admin");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const masterId = Number(id);
  const { sale_jugador_id, entra_jugador_id } = await request.json();

  if (!sale_jugador_id || !entra_jugador_id)
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const master = await sql`SELECT categoria_id, estado FROM masters WHERE id = ${masterId}`;
  if (master.length === 0) return NextResponse.json({ error: "Master no encontrado" }, { status: 404 });
  if (master[0].estado === "finalizado")
    return NextResponse.json({ error: "El Master está finalizado" }, { status: 400 });

  const participante = await sql`
    SELECT id FROM master_participantes WHERE master_id = ${masterId} AND jugador_id = ${sale_jugador_id}
  `;
  if (participante.length === 0)
    return NextResponse.json({ error: "El jugador a reemplazar no está clasificado" }, { status: 400 });

  const yaEsta = await sql`
    SELECT 1 FROM master_participantes WHERE master_id = ${masterId} AND jugador_id = ${entra_jugador_id}
  `;
  if (yaEsta.length > 0)
    return NextResponse.json({ error: "El jugador entrante ya está clasificado" }, { status: 400 });

  // Verificar que el entrante pertenece a la categoría y está activo
  const entra = await sql`
    SELECT COALESCE(pc.puntos_acumulados, 0) AS puntos
    FROM jugador_categorias jc
    JOIN jugadores j ON j.id = jc.jugador_id
    LEFT JOIN puntos_categoria pc ON pc.jugador_id = j.id AND pc.categoria_id = ${master[0].categoria_id}
    WHERE jc.jugador_id = ${entra_jugador_id} AND jc.categoria_id = ${master[0].categoria_id} AND j.estado = 'activo'
  `;
  if (entra.length === 0)
    return NextResponse.json({ error: "El jugador entrante no pertenece a la categoría" }, { status: 400 });

  await sql`
    UPDATE master_participantes
    SET jugador_id = ${entra_jugador_id},
        puntos = ${Number(entra[0].puntos) || 0},
        es_reemplazo = true,
        reemplaza_a_jugador_id = ${sale_jugador_id}
    WHERE id = ${participante[0].id}
  `;

  // Si ya se había sorteado, el bracket queda desactualizado: se recomienda re-sortear.
  const necesitaResorteo = master[0].estado === "sorteado";
  return NextResponse.json({ success: true, necesita_resorteo: necesitaResorteo });
}
