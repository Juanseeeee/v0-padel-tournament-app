const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_nrG8ZMy1qTSA@ep-steep-sound-ah2s3ppq.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  await client.connect();
  
  try {
    console.log("--- JUGADORES ---");
    const res1 = await client.query(`
      SELECT id, nombre, apellido, categoria_actual_id
      FROM jugadores
      WHERE (nombre ILIKE '%AGUST%N%' AND apellido ILIKE '%ULLUA%')
         OR (nombre ILIKE '%HERNAN%' AND apellido ILIKE '%GHERPELLI%')
         OR (nombre ILIKE '%LAUTARO%' AND apellido ILIKE '%DE LEON%')
         OR (nombre ILIKE '%NICOLAS%' AND apellido ILIKE '%DUCASSE%')
    `);
    console.log(JSON.stringify(res1.rows, null, 2));

    if (res1.rows.length > 0) {
      const ids = res1.rows.map(j => j.id);
      
      console.log("\n--- PUNTOS ACTUALES EN RANKING ---");
      const res2 = await client.query(`
        SELECT jugador_id, categoria_id, puntos_acumulados 
        FROM ranking_categorias 
        WHERE jugador_id = ANY($1)
      `, [ids]);
      console.log(JSON.stringify(res2.rows, null, 2));

      console.log("\n--- PARTICIPACIONES ---");
      const res3 = await client.query(`
        SELECT * FROM participaciones WHERE jugador_id = ANY($1)
      `, [ids]);
      console.log(JSON.stringify(res3.rows, null, 2));

      console.log("\n--- HISTORIAL PUNTOS ---");
      const res4 = await client.query(`
        SELECT * FROM historial_puntos WHERE jugador_id = ANY($1)
      `, [ids]);
      console.log(JSON.stringify(res4.rows, null, 2));

      console.log("\n--- ASCENSOS ---");
      const res5 = await client.query(`
        SELECT * FROM ascensos WHERE jugador_id = ANY($1)
      `, [ids]);
      console.log(JSON.stringify(res5.rows, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
