const { neon } = require('@neondatabase/serverless');
require('dotenv').config({path: '.env.local'});
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const t1 = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'historial_puntos'`;
  const t2 = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ascensos'`;
  fs.writeFileSync('schema_tables.json', JSON.stringify({historial_puntos: t1, ascensos: t2}, null, 2));      
}
run();