const { neon } = require('@neondatabase/serverless');
require('dotenv').config({path: '.env.local'});
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const result = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'fechas_torneo'`;
  fs.writeFileSync('schema_output.json', JSON.stringify(result, null, 2));
}
run();