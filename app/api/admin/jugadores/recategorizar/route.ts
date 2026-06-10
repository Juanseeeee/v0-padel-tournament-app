import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

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
      // Tomamos la mejor fuente disponible para evitar ascensos con arrastre en 0
      // cuando puntos_categoria todavia no existe o quedo desincronizada.
      const puntosSnapshot = await sql`
        WITH puntos_categoria_actual AS (
          SELECT MAX(puntos_acumulados) AS total
          FROM puntos_categoria
          WHERE jugador_id = ${jugador_id} AND categoria_id = ${categoria_anterior_id}
        ),
        puntos_historial AS (
          SELECT SUM(puntos_acumulados) AS total
          FROM historial_puntos
          WHERE jugador_id = ${jugador_id}
            AND categoria_id = ${categoria_anterior_id}
            AND (
              fecha_torneo_id IS NOT NULL
              OR motivo IS NULL
              OR motivo NOT ILIKE 'Transferencia 50% por ascenso%'
            )
        ),
        puntos_participaciones AS (
          SELECT SUM(puntos_obtenidos) AS total
          FROM participaciones
          WHERE jugador_id = ${jugador_id} AND categoria_id = ${categoria_anterior_id}
        )
        SELECT GREATEST(
          COALESCE((SELECT total FROM puntos_categoria_actual), 0),
          COALESCE((SELECT total FROM puntos_historial), 0),
          COALESCE((SELECT total FROM puntos_participaciones), 0)
        ) AS puntos_actuales
      `;

      const puntosActuales = Number(puntosSnapshot[0]?.puntos_actuales || 0);
      let puntosTransferir = 0;
      
      // Logic for Ascenso with Points Transfer
      if (tipo === "ascenso" && puntosActuales > 0) {
        puntosTransferir = Math.floor(puntosActuales * 0.5); // 50%
        
        // Add points to new category
        // Check if entry exists in puntos_categoria for new category
        const statsNuevaCat = await sql`
          SELECT id, puntos_acumulados FROM puntos_categoria 
          WHERE jugador_id = ${jugador_id} AND categoria_id = ${categoria_nueva_id}
        `;
        
        if (statsNuevaCat.length > 0) {
           await sql`
             UPDATE puntos_categoria 
             SET puntos_acumulados = puntos_acumulados + ${puntosTransferir},
                 updated_at = NOW()
             WHERE id = ${statsNuevaCat[0].id}
           `;
        } else {
           await sql`
             INSERT INTO puntos_categoria (jugador_id, categoria_id, puntos_acumulados)
             VALUES (${jugador_id}, ${categoria_nueva_id}, ${puntosTransferir})
           `;
        }
        
        // Registrar en historial_puntos también para trazabilidad completa
        await sql`
          INSERT INTO historial_puntos (jugador_id, categoria_id, puntos_acumulados, motivo)
          VALUES (${jugador_id}, ${categoria_nueva_id}, ${puntosTransferir}, 'Transferencia 50% por ascenso')
        `;
      }

      // Log in ascensos table for ALL recategorizations (ascenso or descenso)
      await sql`
        INSERT INTO ascensos (
          jugador_id, fecha_ascenso, categoria_origen_id, categoria_destino_id, 
          puntos_origen, puntos_transferidos
        ) VALUES (
          ${jugador_id}, NOW(), ${categoria_anterior_id}, ${categoria_nueva_id}, 
          ${puntosActuales}, ${puntosTransferir}
        )
      `;

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

    return NextResponse.json({
      success: true,
      message: `Jugador recategorizado exitosamente a ${catNueva[0].nombre}`,
    });
  } catch (error) {
    console.error("Error en recategorizacion:", error);
    return NextResponse.json({ error: "Error al recategorizar" }, { status: 500 });
  }
}
