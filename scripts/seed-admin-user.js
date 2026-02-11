import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const email = "admin@padel.com";
  const password = "admin123";
  const passwordHash = hashPassword(password);

  // Check if already exists
  const existing = await sql`SELECT id FROM usuarios WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log("Admin user already exists");
    return;
  }

  await sql`
    INSERT INTO usuarios (email, password_hash, nombre, apellido, rol)
    VALUES (${email}, ${passwordHash}, 'Admin', 'Sistema', 'admin')
  `;

  console.log("Admin user created successfully");
  console.log("Email:", email);
  console.log("Password:", password);
}

main().catch(console.error);
