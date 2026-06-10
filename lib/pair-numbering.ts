import { sql } from "@/lib/db";

export async function compactPairNumbers(
  fechaTorneoId: number,
  categoriaId: number | null | undefined
) {
  if (!fechaTorneoId || !categoriaId) return;

  const parejas = await sql`
    SELECT id
    FROM parejas_torneo
    WHERE fecha_torneo_id = ${fechaTorneoId}
      AND categoria_id = ${categoriaId}
    ORDER BY numero_pareja ASC NULLS LAST, created_at ASC, id ASC
  `;

  let nextNumber = 1;
  for (const pareja of parejas) {
    await sql`
      UPDATE parejas_torneo
      SET numero_pareja = ${nextNumber}
      WHERE id = ${pareja.id}
        AND numero_pareja IS DISTINCT FROM ${nextNumber}
    `;
    nextNumber++;
  }
}
