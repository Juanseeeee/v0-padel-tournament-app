export function buildTorneosQuery(
  filters: { categoryId?: number | null; page?: number; limit?: number }
) {
  const { categoryId, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      f.id,
      f.numero_fecha,
      f.temporada,
      f.estado,
      f.fecha_calendario,
      f.sede,
      f.direccion,
      f.hora_inicio_viernes,
      f.hora_inicio_sabado,
      f.duracion_partido_min,
      f.categoria_id,
      c.nombre as categoria_nombre,
      (
        SELECT COUNT(*)
        FROM parejas_torneo pt
        WHERE pt.fecha_torneo_id = f.id AND pt.categoria_id = f.categoria_id
      ) as parejas_count
    FROM fechas_torneo f
    JOIN categorias c ON c.id = f.categoria_id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  if (categoryId) {
    query += ` AND f.categoria_id = $${params.length + 1}`;
    params.push(categoryId);
  }

  // Logic for count query would use the query up to here
  const countQuery = `SELECT COUNT(*) as count FROM (${query}) as sub`;
  const countParams = [...params];

  // Add ordering and pagination
  query += `
    ORDER BY 
      CASE 
        WHEN f.estado = 'en_juego' THEN 1 
        WHEN f.estado = 'programada' THEN 2 
        ELSE 3 
      END ASC,
      f.fecha_calendario DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  params.push(limit, offset);

  return { query, countQuery, params, countParams };
}
