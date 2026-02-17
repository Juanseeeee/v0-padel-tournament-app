
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    console.log("Seeding users via API...");

    // 1. Create Admin User
    const adminEmail = "admin@test.com";
    const adminPassword = "admin123";
    const adminHash = await hashPassword(adminPassword);

    // Check if admin exists
    const existingAdmin = await sql`SELECT id FROM usuarios WHERE email = ${adminEmail}`;
    
    if (existingAdmin.length > 0) {
      await sql`
        UPDATE usuarios 
        SET password_hash = ${adminHash} 
        WHERE email = ${adminEmail}
      `;
    } else {
      await sql`
        INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, jugador_id)
        VALUES (${adminEmail}, ${adminHash}, 'Admin', 'Test', 'admin', NULL)
      `;
    }

    // 2. Create Player User
    const playerEmail = "jugador@test.com";
    const playerPassword = "jugador123";
    const playerHash = await hashPassword(playerPassword);

    // Check if player user exists
    const existingPlayerUser = await sql`SELECT id, jugador_id FROM usuarios WHERE email = ${playerEmail}`;

    if (existingPlayerUser.length > 0) {
       await sql`
        UPDATE usuarios 
        SET password_hash = ${playerHash} 
        WHERE email = ${playerEmail}
      `;
    } else {
      // Get a valid category id
      const categories = await sql`SELECT id FROM categorias LIMIT 1`;
      const categoryId = categories.length > 0 ? categories[0].id : null;

      // Create jugador record first
      const jugador = await sql`
        INSERT INTO jugadores (nombre, apellido, localidad, estado, categoria_actual_id, puntos_totales)
        VALUES ('Jugador', 'Test', 'Test City', 'activo', ${categoryId}, 0)
        RETURNING id
      `;
      const jugadorId = jugador[0].id;

      // Create user record
      await sql`
        INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, jugador_id)
        VALUES (${playerEmail}, ${playerHash}, 'Jugador', 'Test', 'jugador', ${jugadorId})
      `;
    }

    return NextResponse.json({ 
      message: "Users seeded successfully",
      admin: { email: adminEmail, password: adminPassword },
      player: { email: playerEmail, password: playerPassword }
    });

  } catch (error) {
    console.error("Error seeding users:", error);
    return NextResponse.json({ error: "Error seeding users" }, { status: 500 });
  }
}
