import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const jugadoresLocs = await sql`SELECT DISTINCT localidad FROM jugadores WHERE localidad IS NOT NULL AND TRIM(localidad) <> ''`;
    const sedesLocs = await sql`SELECT DISTINCT localidad FROM sedes WHERE localidad IS NOT NULL AND TRIM(localidad) <> ''`;
    const set = new Set<string>();
    for (const r of jugadoresLocs as any[]) {
      if (r.localidad && typeof r.localidad === "string") set.add(r.localidad.trim());
    }
    for (const r of sedesLocs as any[]) {
      if (r.localidad && typeof r.localidad === "string") set.add(r.localidad.trim());
    }
    const nombres = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
    const result = nombres.map((nombre, idx) => ({ id: idx + 1, nombre }));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}
