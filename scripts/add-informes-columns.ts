console.log("Script starting...");
import { config } from 'dotenv';
config({ path: '.env.local' });

async function runMigration() {
  const { sql } = await import("@/lib/db");
  try {
    console.log("Starting migration for 'informes' table...");

    await sql`
      ALTER TABLE informes 
      ADD COLUMN IF NOT EXISTS autor VARCHAR(100),
      ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false;
    `;
    
    console.log("Successfully added columns 'autor', 'imagen_url', 'destacado' to 'informes' table.");
  } catch (error) {
    console.error("Error running migration:", error);
  }
}

runMigration();
