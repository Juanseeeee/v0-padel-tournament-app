
import { sql } from "../lib/db";
import { hashPassword } from "../lib/auth";

async function seed() {
  console.log("Seeding users...");

  try {
    // 1. Create Admin User
    const adminEmail = "admin@test.com";
    const adminPassword = "admin123";
    const adminHash = await hashPassword(adminPassword);

    // Check if admin exists
    const existingAdmin = await sql`SELECT id FROM usuarios WHERE email = ${adminEmail}`;
    
    if (existingAdmin.length > 0) {
      console.log("Admin user already exists. Updating password...");
      await sql`
        UPDATE usuarios 
        SET password_hash = ${adminHash} 
        WHERE email = ${adminEmail}
      `;
    } else {
      console.log("Creating admin user...");
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
       console.log("Player user already exists. Updating password...");
       await sql`
        UPDATE usuarios 
        SET password_hash = ${playerHash} 
        WHERE email = ${playerEmail}
      `;
    } else {
      console.log("Creating player user...");
      
      // Get a valid category id (assuming categories exist, otherwise use null or 1)
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

    console.log("Seeding completed successfully.");
    console.log("Admin: admin@test.com / admin123");
    console.log("Player: jugador@test.com / jugador123");

  } catch (error) {
    console.error("Error seeding users:", error);
  }
}

seed();
