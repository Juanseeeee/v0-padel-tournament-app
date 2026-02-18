
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json(); // "email" here can be email or DNI

    if (!email || !password) {
      return NextResponse.json({ error: "Email/DNI y password son requeridos" }, { status: 400 });
    }

    const identifier = email.trim(); // User input

    const users = await sql`
      SELECT id, email, nombre, apellido, rol, password_hash
      FROM usuarios
      WHERE email = ${identifier.toLowerCase()} OR dni = ${identifier}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
