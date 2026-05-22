const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const rows = await sql`
    SELECT
      z.id AS zona_id,
      z.nombre,
      z.estado,
      COUNT(*) FILTER (WHERE pz.posicion_final IS NULL) AS nulls,
      COUNT(*) AS total
    FROM zonas z
    JOIN parejas_zona pz ON pz.zona_id = z.id
    GROUP BY z.id, z.nombre, z.estado
    HAVING COUNT(*) FILTER (WHERE pz.posicion_final IS NULL) > 0
    ORDER BY z.id DESC
    LIMIT 20
  `;

  console.log(JSON.stringify(rows, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
