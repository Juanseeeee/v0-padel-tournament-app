import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide a SQL file path");
    process.exit(1);
  }
  
  // Import db dynamically after env vars are loaded
  const { sql } = await import('../lib/db');

  const query = fs.readFileSync(filePath, 'utf-8');
  console.log("Executing query:", query);
  
  const strings = [query] as any;
  strings.raw = [query];
  try {
      const result = await sql(strings);
      console.log(JSON.stringify(result, null, 2));
  } catch (e) {
      console.error(e);
  }
}

run();