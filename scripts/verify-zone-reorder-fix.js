const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  let torneoId = null;
  let zonaId = null;
  const createdPlayerIds = [];

  try {
    const categoriaRows = await sql`SELECT id FROM categorias LIMIT 1`;
    const categoriaId = categoriaRows[0]?.id;
    if (!categoriaId) {
      throw new Error("No se encontro una categoria para la prueba");
    }

    const torneoRows = await sql`
      INSERT INTO fechas_torneo (
        numero_fecha,
        fecha_calendario,
        sede,
        duracion_partido_min,
        temporada,
        categoria_id
      )
      VALUES (12, '2099-01-02', 'TEST_SEDE_FIX', 60, 2099, ${categoriaId})
      RETURNING id
    `;
    torneoId = torneoRows[0].id;

    const zonaRows = await sql`
      INSERT INTO zonas (fecha_torneo_id, categoria_id, nombre, estado)
      VALUES (${torneoId}, ${categoriaId}, 'Zona Test Fix', 'en_juego')
      RETURNING id
    `;
    zonaId = zonaRows[0].id;

    for (const suffix of ["A1", "A2", "B1", "B2"]) {
      const playerRows = await sql`
        INSERT INTO jugadores (nombre, apellido, categoria_actual_id)
        VALUES (${`Test${suffix}`}, 'VerifyFix', ${categoriaId})
        RETURNING id
      `;
      createdPlayerIds.push(playerRows[0].id);
    }

    const pair1Rows = await sql`
      INSERT INTO parejas_torneo (fecha_torneo_id, jugador1_id, jugador2_id, categoria_id)
      VALUES (${torneoId}, ${createdPlayerIds[0]}, ${createdPlayerIds[1]}, ${categoriaId})
      RETURNING id
    `;
    const pair2Rows = await sql`
      INSERT INTO parejas_torneo (fecha_torneo_id, jugador1_id, jugador2_id, categoria_id)
      VALUES (${torneoId}, ${createdPlayerIds[2]}, ${createdPlayerIds[3]}, ${categoriaId})
      RETURNING id
    `;

    const pair1Id = pair1Rows[0].id;
    const pair2Id = pair2Rows[0].id;

    await sql`INSERT INTO parejas_zona (zona_id, pareja_id) VALUES (${zonaId}, ${pair1Id})`;
    await sql`INSERT INTO parejas_zona (zona_id, pareja_id) VALUES (${zonaId}, ${pair2Id})`;

    const beforeRows = await sql`
      SELECT pareja_id, posicion_final, id
      FROM parejas_zona
      WHERE zona_id = ${zonaId}
      ORDER BY id ASC
    `;

    const response = await fetch(`http://localhost:3000/api/admin/torneo/${torneoId}/zonas/mover-pareja`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pareja_torneo_id: pair1Id,
        zona_origen_id: zonaId,
        zona_destino_id: zonaId,
        pareja_intercambio_id: pair2Id,
        accion: "intercambiar",
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(`El endpoint devolvio ${response.status}: ${JSON.stringify(payload)}`);
    }

    const afterRows = await sql`
      SELECT pareja_id, posicion_final, id
      FROM parejas_zona
      WHERE zona_id = ${zonaId}
      ORDER BY posicion_final ASC, id ASC
    `;

    console.log(JSON.stringify({
      ok: true,
      torneoId,
      zonaId,
      beforeRows,
      afterRows,
    }, null, 2));
  } finally {
    if (zonaId) {
      await sql`DELETE FROM partidos_zona WHERE zona_id = ${zonaId}`;
      await sql`DELETE FROM parejas_zona WHERE zona_id = ${zonaId}`;
      await sql`DELETE FROM zonas WHERE id = ${zonaId}`;
    }
    if (torneoId) {
      await sql`DELETE FROM parejas_torneo WHERE fecha_torneo_id = ${torneoId}`;
      await sql`DELETE FROM fechas_torneo WHERE id = ${torneoId}`;
    }
    if (createdPlayerIds.length > 0) {
      await sql`DELETE FROM jugadores WHERE id IN (${createdPlayerIds[0]}, ${createdPlayerIds[1]}, ${createdPlayerIds[2]}, ${createdPlayerIds[3]})`;
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
