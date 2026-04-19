const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const torneoId = 125;
  const zonas = await sql`
    SELECT z.id, z.nombre 
    FROM zonas z
    WHERE z.fecha_torneo_id = ${torneoId} AND z.estado = 'finalizada'
  `;

  for (const zona of zonas) {
    const zonaIdNum = zona.id;
    const parejas = await sql`
      SELECT pareja_id
      FROM parejas_zona
      WHERE zona_id = ${zonaIdNum}
      ORDER BY 
        partidos_ganados DESC, 
        (sets_ganados - sets_perdidos) DESC, 
        (games_ganados - games_perdidos) DESC,
        games_ganados DESC
    `;
    
    const ordenParejasIds = parejas.map((p) => p.pareja_id);
    for (let i = 0; i < ordenParejasIds.length; i++) {
      await sql`
        UPDATE parejas_zona 
        SET posicion_final = ${i + 1}
        WHERE zona_id = ${zonaIdNum} AND pareja_id = ${ordenParejasIds[i]}
      `;
    }
    console.log(`Fixed posiciones finales para ${zona.nombre}`);
  }
}
run().catch(console.error);