
import { sql } from "@/lib/db";

async function runMigration() {
  try {
    await sql`
      ALTER TABLE partidos_zona 
      ADD COLUMN IF NOT EXISTS set1_tiebreak VARCHAR(10),
      ADD COLUMN IF NOT EXISTS set2_tiebreak VARCHAR(10),
      ADD COLUMN IF NOT EXISTS set3_tiebreak VARCHAR(10);
    `;
    console.log("Updated partidos_zona");

    await sql`
      ALTER TABLE llaves 
      ADD COLUMN IF NOT EXISTS set1_tiebreak VARCHAR(10),
      ADD COLUMN IF NOT EXISTS set2_tiebreak VARCHAR(10),
      ADD COLUMN IF NOT EXISTS set3_tiebreak VARCHAR(10);
    `;
    console.log("Updated llaves");
    
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Error running migration:", error);
  }
}

runMigration();
