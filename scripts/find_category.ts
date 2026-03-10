import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const cats = await sql`SELECT id, nombre FROM categorias ORDER BY id`;
  console.log("Categorías:", cats);
}

main();