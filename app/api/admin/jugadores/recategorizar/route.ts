import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { jugador_id, categoria_anterior_id, categoria_nueva_id, tipo } = await request.json();

    if (!jugador_id || !categoria_nueva_id || !tipo) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Get jugador info
    const jugador = await sql`SELECT id, nombre, apellido FROM jugadores WHERE id = ${jugador_id}`;
    if (jugador.length === 0) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    // Get category names
    const catAnterior = categoria_anterior_id
      ? await sql`SELECT nombre FROM categorias WHERE id = ${categoria_anterior_id}`
      : [{ nombre: "Sin categoria" }];
    const catNueva = await sql`SELECT nombre FROM categorias WHERE id = ${categoria_nueva_id}`;

    if (catNueva.length === 0) {
      return NextResponse.json({ error: "Categoria nueva no encontrada" }, { status: 404 });
    }

    // Remove old category association if exists
    if (categoria_anterior_id) {
      await sql`
        DELETE FROM jugador_categorias 
        WHERE jugador_id = ${jugador_id} AND categoria_id = ${categoria_anterior_id}
      `;
    }

    // Add new category association (check if not already exists)
    const existingAssoc = await sql`
      SELECT id FROM jugador_categorias WHERE jugador_id = ${jugador_id} AND categoria_id = ${categoria_nueva_id}
    `;
    if (existingAssoc.length === 0) {
      await sql`
        INSERT INTO jugador_categorias (jugador_id, categoria_id)
        VALUES (${jugador_id}, ${categoria_nueva_id})
      `;
    }

    // Update categoria_actual_id on jugadores table
    await sql`UPDATE jugadores SET categoria_actual_id = ${categoria_nueva_id} WHERE id = ${jugador_id}`;

    // Generate automatic news/informe
    const nombreJugador = `${jugador[0].nombre} ${jugador[0].apellido}`;
    const tipoTexto = tipo === "ascenso" ? "ASCENSO" : "DESCENSO";
    const titulo = `Recategorizacion: ${tipoTexto} de ${nombreJugador}`;
    const contenido = `El jugador ${nombreJugador} ha sido recategorizado.\n\n` +
      `Tipo: ${tipoTexto}\n` +
      `Categoria anterior: ${catAnterior[0]?.nombre || "Sin categoria"}\n` +
      `Categoria nueva: ${catNueva[0].nombre}\n\n` +
      `Esta recategorizacion fue aplicada el ${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

    const etiquetas = JSON.stringify(["recategorizacion", tipo, catNueva[0].nombre.toLowerCase()]);

    await sql`
      INSERT INTO informes (titulo, contenido, fecha_publicacion, categoria_relacionada_id, etiquetas, publicado)
      VALUES (${titulo}, ${contenido}, NOW(), ${categoria_nueva_id}, ${etiquetas}, true)
    `;

    return NextResponse.json({
      success: true,
      message: `${nombreJugador} recategorizado: ${tipoTexto} a ${catNueva[0].nombre}`,
    });
  } catch (error) {
    console.error("Error en recategorizacion:", error);
    return NextResponse.json({ error: "Error al recategorizar" }, { status: 500 });
  }
}
