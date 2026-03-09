import { buildTorneosQuery } from './torneos';

describe('buildTorneosQuery', () => {
  test('should return default query with default pagination', () => {
    const { query, countQuery, params, countParams } = buildTorneosQuery({});

    expect(query).toContain('SELECT');
    expect(query).toContain('FROM fechas_torneo f');
    expect(query).toContain('ORDER BY');
    expect(query).toContain('LIMIT $1 OFFSET $2');
    
    // Default limit 20, offset 0
    expect(params).toEqual([20, 0]);
    expect(countParams).toEqual([]);
    expect(countQuery).toContain('SELECT COUNT(*)');
  });

  test('should include category filter when provided', () => {
    const categoryId = 5;
    const { query, params, countParams } = buildTorneosQuery({ categoryId });

    expect(query).toContain('AND f.categoria_id = $1');
    expect(query).toContain('LIMIT $2 OFFSET $3');
    
    // Category ID first, then limit, then offset
    expect(params).toEqual([5, 20, 0]);
    expect(countParams).toEqual([5]);
  });

  test('should calculate offset correctly based on page', () => {
    const page = 3;
    const limit = 10;
    const { params } = buildTorneosQuery({ page, limit });

    // Offset = (3-1) * 10 = 20
    expect(params).toEqual([10, 20]);
  });

  test('should handle both category and pagination', () => {
    const categoryId = 2;
    const page = 2;
    const limit = 5;
    const { params, countParams } = buildTorneosQuery({ categoryId, page, limit });

    // Offset = (2-1) * 5 = 5
    // Params: [categoryId, limit, offset]
    expect(params).toEqual([2, 5, 5]);
    expect(countParams).toEqual([2]);
  });
});
