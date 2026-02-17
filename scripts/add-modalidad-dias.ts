
import { sql } from "@/lib/db";

async function run() {
  console.log("Adding columns to fechas_torneo...");
  try {
    await sql`
      ALTER TABLE fechas_torneo 
      ADD COLUMN IF NOT EXISTS modalidad TEXT DEFAULT 'normal_3_sets_6',
      ADD COLUMN IF NOT EXISTS dias_juego TEXT DEFAULT 'viernes,sabado,domingo'
    `;
    console.log("Columns added successfully.");
  } catch (error) {
    console.error("Error adding columns:", error);
  }
}

run();
