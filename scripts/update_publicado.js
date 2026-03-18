const { neon } = require('@neondatabase/serverless');
require('dotenv').config({path: '.env.local'});
const sql = neon(process.env.DATABASE_URL);
async function run() {
  await sql`UPDATE fechas_torneo SET publicado = true`;
  console.log("All existing rows set to publicado = true.");
}
run();