import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token y nueva contraseña requeridos" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    // Buscar el token
    const [resetRecord] = await sql`
      SELECT id, usuario_id, expires_at, usado
      FROM password_resets
      WHERE token = ${token}
    `;

    if (!resetRecord) {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
    }

    if (resetRecord.usado) {
      return NextResponse.json({ error: "Este enlace ya fue utilizado" }, { status: 400 });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "El enlace de recuperación ha expirado" }, { status: 400 });
    }

    // Actualizar la contraseña
    const passwordHash = await hashPassword(newPassword);

    // Iniciar transacción para actualizar contraseña y marcar token como usado
    await sql.begin(async (sql) => {
      await sql`
        UPDATE usuarios
        SET password_hash = ${passwordHash}
        WHERE id = ${resetRecord.usuario_id}
      `;

      await sql`
        UPDATE password_resets
        SET usado = true
        WHERE id = ${resetRecord.id}
      `;
    });

    return NextResponse.json({ message: "Contraseña actualizada exitosamente" });

  } catch (error) {
    console.error("Error en reset-password:", error);
    return NextResponse.json({ error: "Ocurrió un error interno" }, { status: 500 });
  }
}
