import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const categorias = await sql`SELECT id, nombre FROM categorias ORDER BY nombre`;
  return NextResponse.json(categorias);
}
