
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    // 1. Buscar categoría
    console.log('Buscando categoría 6TA CABALLEROS...');
    const cats = await sql`SELECT * FROM categorias WHERE nombre ILIKE '%6TA%CABALLEROS%' OR nombre ILIKE '%SEXTA%CABALLEROS%'`;
    
    if (cats.length === 0) {
      console.log('No se encontró la categoría.');
      return;
    }
    
    const cat = cats[0];
    console.log(`Categoría encontrada: ${cat.nombre} (ID: ${cat.id})`);

    // 2. Ver configuración de puntos
    console.log('\nConfiguración de puntos actual:');
    const config = await sql`SELECT * FROM puntos_configuracion ORDER BY puntos DESC`;
    console.table(config);

    // 3. Ver participaciones y puntos en torneos finalizados para esta categoría
    console.log(`\nParticipaciones en categoría ${cat.id}:`);
    const parts = await sql`
      SELECT 
        p.id, p.jugador_id, 
        j.nombre || ' ' || j.apellido as jugador,
        p.instancia_alcanzada, p.puntos_obtenidos,
        f.id as fecha_id, f.fecha_calendario
      FROM participaciones p
      JOIN jugadores j ON p.jugador_id = j.id
      JOIN fechas_torneo f ON p.fecha_torneo_id = f.id
      WHERE p.categoria_id = ${cat.id}
      ORDER BY f.fecha_calendario DESC, p.puntos_obtenidos DESC
    `;
    
    if (parts.length === 0) {
        console.log('No hay participaciones registradas para esta categoría.');
    } else {
        console.table(parts.slice(0, 10)); // Mostrar primeros 10
        
        // Análisis de puntos
        const campeones = parts.filter(p => p.instancia_alcanzada === 'campeon');
        const semis = parts.filter(p => p.instancia_alcanzada === 'semis');
        
        console.log('\nAnálisis de puntos:');
        console.log(`Campeones encontrados: ${campeones.length}. Puntos: ${campeones.map(c => c.puntos_obtenidos).join(', ')}`);
        console.log(`Semifinalistas encontrados: ${semis.length}. Puntos: ${semis.map(c => c.puntos_obtenidos).join(', ')}`);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
