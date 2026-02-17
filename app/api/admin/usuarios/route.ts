
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const usuarios = await sql`
      SELECT id, email, nombre, apellido, rol, created_at 
      FROM usuarios 
      ORDER BY created_at DESC
    `;
    return NextResponse.json(usuarios);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, nombre, apellido } = await request.json();

    if (!email || !password || !nombre || !apellido) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Check existing
    const existing = await sql`SELECT id FROM usuarios WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await sql`
      INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, jugador_id)
      VALUES (${email}, ${passwordHash}, ${nombre}, ${apellido}, 'admin', NULL)
      RETURNING id, email, nombre, rol
    `;

    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: "Error al crear administrador" }, { status: 500 });
  }
}
