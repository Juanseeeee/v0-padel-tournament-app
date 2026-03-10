
import { sql } from "@/lib/db";

async function checkSchema() {
  try {
    const partidosColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'partidos_zona';
    `;
    console.log("partidos_zona columns:", partidosColumns);

    const llavesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'llaves';
    `;
    console.log("llaves columns:", llavesColumns);
  } catch (error) {
    console.error("Error checking schema:", error);
  }
}

checkSchema();
