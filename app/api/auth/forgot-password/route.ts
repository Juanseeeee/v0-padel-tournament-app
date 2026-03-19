import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "El email es requerido" }, { status: 400 });
    }

    // Buscar al usuario
    const [user] = await sql`SELECT id, email, nombre FROM usuarios WHERE email = ${email}`;

    if (!user) {
      // Devolver 200 de todas formas por seguridad
      return NextResponse.json({ message: "Si el correo existe, se enviará un enlace de recuperación." });
    }

    // Generar token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    // Guardar en la base de datos
    await sql`
      INSERT INTO password_resets (usuario_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `;

    // Configurar transporte de nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Padel App" <noreply@padelapp.com>',
      to: user.email,
      subject: "Recuperación de Contraseña",
      html: \`
        <h1>Hola \${user.nombre},</h1>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el enlace de abajo para crear una nueva:</p>
        <a href="\${resetUrl}" style="display: inline-block; padding: 10px 20px; margin: 10px 0; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      \`,
    };

    // Si no hay configuración de SMTP, mostramos el enlace por consola (útil para desarrollo)
    if (!process.env.SMTP_USER) {
      console.log('--- ENLACE DE RECUPERACIÓN (Modo Desarrollo) ---');
      console.log(resetUrl);
      console.log('------------------------------------------------');
    } else {
      await transporter.sendMail(mailOptions);
    }

    return NextResponse.json({ message: "Si el correo existe, se enviará un enlace de recuperación." });

  } catch (error) {
    console.error("Error en forgot-password:", error);
    return NextResponse.json({ error: "Ocurrió un error interno" }, { status: 500 });
  }
}
