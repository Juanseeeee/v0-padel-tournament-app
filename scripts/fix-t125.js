const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const zonaIdNum = 408; // Zona A, 5ta Damas
  const parejas = await sql`
        SELECT pareja_id, partidos_ganados, sets_ganados, sets_perdidos, games_ganados, games_perdidos
        FROM parejas_zona
        WHERE zona_id = ${zonaIdNum}
        ORDER BY 
          partidos_ganados DESC, 
          (sets_ganados - sets_perdidos) DESC, 
          (games_ganados - games_perdidos) DESC,
          games_ganados DESC
      `;
  console.log('New Order:', parejas);

  // Apply the update so the database has the correct `posicion_final`
  const ordenParejasIds = parejas.map((p) => p.pareja_id);
  for (let i = 0; i < ordenParejasIds.length; i++) {
    await sql`
      UPDATE parejas_zona 
      SET posicion_final = ${i + 1}
      WHERE zona_id = ${zonaIdNum} AND pareja_id = ${ordenParejasIds[i]}
    `;
  }
  console.log('Fixed posiciones finales para Zona A');
}
run().catch(console.error);