const { neon } = require('@neondatabase/serverless');
require('dotenv').config({path: '.env.local'});
const sql = neon(process.env.DATABASE_URL);
async function run() {
  await sql`ALTER TABLE fechas_torneo ADD COLUMN publicado BOOLEAN DEFAULT false`;
  console.log("Column 'publicado' added successfully.");
}
run();