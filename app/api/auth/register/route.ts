
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, nombre, apellido, telefono, dni, localidad, categoria_id } = await request.json();

    if (!email || !password || !nombre || !apellido || !categoria_id || !telefono || !dni) {
      return NextResponse.json({ error: "Todos los campos son obligatorios (incluyendo DNI y teléfono)" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    // Check if email already exists
    const existingEmail = await sql`SELECT id FROM usuarios WHERE email = ${email.toLowerCase().trim()}`;
    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Ya existe una cuenta con este email" }, { status: 409 });
    }

    // Check if dni already exists
    const existingDni = await sql`SELECT id FROM usuarios WHERE dni = ${dni.trim()}`;
    if (existingDni.length > 0) {
      return NextResponse.json({ error: "Ya existe una cuenta con este DNI" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Try to find an existing jugador created por admin (sin usuario) por nombre y apellido
    const existingJugador = await sql`
      SELECT j.id
      FROM jugadores j
      LEFT JOIN usuarios u ON u.jugador_id = j.id
      WHERE UPPER(j.nombre) = ${nombre.toUpperCase()}
        AND UPPER(j.apellido) = ${apellido.toUpperCase()}
        AND u.id IS NULL
      ORDER BY j.created_at ASC
      LIMIT 1
    `;
    let jugadorId: number;
    if (existingJugador.length > 0) {
      jugadorId = existingJugador[0].id;
      // Completar datos del jugador existente
      await sql`
        UPDATE jugadores
        SET localidad = ${localidad || null},
            estado = 'activo',
            categoria_actual_id = ${categoria_id}
        WHERE id = ${jugadorId}
      `;
      // Vincular a categoría si no existe aún
      await sql`
        INSERT INTO jugador_categorias (jugador_id, categoria_id)
        VALUES (${jugadorId}, ${categoria_id})
        ON CONFLICT DO NOTHING
      `;
    } else {
      // Crear jugador nuevo
      const jugadores = await sql`
        INSERT INTO jugadores (nombre, apellido, localidad, estado, categoria_actual_id, puntos_totales)
        VALUES (${nombre.toUpperCase()}, ${apellido.toUpperCase()}, ${localidad || null}, 'activo', ${categoria_id}, 0)
        RETURNING id
      `;
      jugadorId = jugadores[0].id;
      // Link to category
      await sql`
        INSERT INTO jugador_categorias (jugador_id, categoria_id)
        VALUES (${jugadorId}, ${categoria_id})
        ON CONFLICT DO NOTHING
      `;
    }

    // Create user account linked to jugador
    const users = await sql`
      INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, jugador_id, dni, telefono)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${nombre}, ${apellido}, 'jugador', ${jugadorId}, ${dni.trim()}, ${telefono})
      RETURNING id, email, nombre, rol
    `;

    await createSession(users[0].id);

    return NextResponse.json({ user: users[0] }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
