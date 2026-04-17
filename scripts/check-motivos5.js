const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const hp = await sql`SELECT * FROM historial_puntos WHERE motivo = 'Transferencia 50% por ascenso'`;
  console.log(hp);
}
run().catch(console.error);