import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const categoriaId = searchParams.get("categoria");

  try {
    let zonas;
    if (categoriaId && categoriaId !== "todas") {
      zonas = await sql`
        SELECT z.*, c.nombre as categoria_nombre,
               (SELECT COUNT(*) FROM parejas_zona pz WHERE pz.zona_id = z.id) as parejas_count
        FROM zonas z
        JOIN categorias c ON z.categoria_id = c.id
        WHERE z.fecha_torneo_id = ${parseInt(id)} AND z.categoria_id = ${parseInt(categoriaId)}
        ORDER BY z.nombre
      `;
    } else {
      zonas = await sql`
        SELECT z.*, c.nombre as categoria_nombre,
               (SELECT COUNT(*) FROM parejas_zona pz WHERE pz.zona_id = z.id) as parejas_count
        FROM zonas z
        JOIN categorias c ON z.categoria_id = c.id
        WHERE z.fecha_torneo_id = ${parseInt(id)}
        ORDER BY z.categoria_id, z.nombre
      `;
    }

    return NextResponse.json(zonas);
  } catch (error) {
    console.error("Error fetching zonas:", error);
    return NextResponse.json({ error: "Error al obtener zonas" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const { categoria_id, tipo } = body;

    if (!categoria_id) {
      return NextResponse.json({ error: "Falta categoria_id" }, { status: 400 });
    }

    // Obtener zonas existentes para determinar la siguiente letra
    const existingZonas = await sql`
      SELECT nombre FROM zonas 
      WHERE fecha_torneo_id = ${parseInt(id)} 
      AND categoria_id = ${parseInt(categoria_id)}
    `;

    // Extraer letras usadas (asumiendo formato "Zona A", "Zona B", etc.)
    const usedLetters = new Set<string>();
    existingZonas.forEach((z: { nombre: string }) => {
      const match = z.nombre.match(/Zona\s+([A-Z])/i);
      if (match) {
        usedLetters.add(match[1].toUpperCase());
      }
    });

    // Encontrar la primera letra disponible
    let nextLetter = 'A';
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      if (!usedLetters.has(char)) {
        nextLetter = char;
        break;
      }
    }

    const nombreZona = `Zona ${nextLetter}`;

    // Validar duplicados (doble check)
    if (usedLetters.has(nextLetter)) {
        return NextResponse.json({ error: "No se pudo determinar un nombre único para la zona" }, { status: 409 });
    }

    // Insertar nueva zona
    const newZona = await sql`
      INSERT INTO zonas (fecha_torneo_id, categoria_id, nombre, tipo, formato)
      VALUES (${parseInt(id)}, ${parseInt(categoria_id)}, ${nombreZona}, 'grupo', ${tipo || 3})
      RETURNING *
    `;

    return NextResponse.json(newZona[0]);
  } catch (error) {
    console.error("Error creating zona:", error);
    return NextResponse.json({ error: "Error al crear zona" }, { status: 500 });
  }
}
