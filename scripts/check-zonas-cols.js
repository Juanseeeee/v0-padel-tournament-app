const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'zonas'`;
  console.log(cols.map(c => c.column_name));
}
run().catch(console.error);