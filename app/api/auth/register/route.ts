import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, nombre, apellido, telefono, localidad, categoria_id } = await request.json();

    if (!email || !password || !nombre || !apellido || !categoria_id) {
      return NextResponse.json({ error: "Nombre, apellido, email, contrasena y categoria son requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contrasena debe tener al menos 6 caracteres" }, { status: 400 });
    }

    // Check if email already exists
    const existing = await sql`SELECT id FROM usuarios WHERE email = ${email.toLowerCase().trim()}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Ya existe una cuenta con este email" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);

    // Create jugador first
    const jugadores = await sql`
      INSERT INTO jugadores (nombre, apellido, localidad, estado, categoria_actual_id, puntos_totales)
      VALUES (${nombre.toUpperCase()}, ${apellido.toUpperCase()}, ${localidad || null}, 'activo', ${categoria_id}, 0)
      RETURNING id
    `;
    const jugadorId = jugadores[0].id;

    // Link to category
    await sql`
      INSERT INTO jugador_categorias (jugador_id, categoria_id)
      VALUES (${jugadorId}, ${categoria_id})
      ON CONFLICT DO NOTHING
    `;

    // Create user account linked to jugador
    const users = await sql`
      INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, jugador_id)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${nombre}, ${apellido}, 'jugador', ${jugadorId})
      RETURNING id, email, nombre, rol
    `;

    await createSession(users[0].id);

    return NextResponse.json({ user: users[0] }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
