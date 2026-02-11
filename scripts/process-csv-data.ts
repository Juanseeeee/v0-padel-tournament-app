import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Datos extraídos de los CSVs
const csvData = {
  categorias: [
    { nombre: '4TA Caballeros', genero: 'masculino' },
    { nombre: '5TA Damas', genero: 'femenino' },
    { nombre: '5TA Caballeros', genero: 'masculino' },
    { nombre: '6TA Damas', genero: 'femenino' },
    { nombre: '6TA Caballeros', genero: 'masculino' },
    { nombre: '7MA Damas', genero: 'femenino' },
    { nombre: '7MA Caballeros', genero: 'masculino' },
    { nombre: '8VA Damas', genero: 'femenino' },
    { nombre: '8VA Caballeros', genero: 'masculino' },
    { nombre: 'SUMA 8', genero: 'mixto' },
  ],
  
  sedes: [
    { nombre: 'Arenales Padel', localidad: 'Arenales', capacidad: 4 },
    { nombre: 'Arribeños Padel', localidad: 'Arribeños', capacidad: 3 },
    { nombre: 'Ascension Padel', localidad: 'Ascension', capacidad: 3 },
    { nombre: 'Ferre Padel', localidad: 'Ferre', capacidad: 4 },
    { nombre: 'Vedia Padel', localidad: 'Vedia', capacidad: 3 },
    { nombre: 'Teodelina Padel', localidad: 'Teodelina', capacidad: 2 },
    { nombre: 'Junin Padel', localidad: 'Junin', capacidad: 3 },
    { nombre: 'Lincoln Padel', localidad: 'Lincoln', capacidad: 2 },
    { nombre: 'Villa Cañas Padel', localidad: 'V. Cañas', capacidad: 2 },
    { nombre: 'La Angelita Padel', localidad: 'La Angelita', capacidad: 2 },
    { nombre: 'Alem Padel', localidad: 'Alem', capacidad: 2 },
    { nombre: 'Colon Padel', localidad: 'Colon', capacidad: 2 },
    { nombre: 'Maria Teresa Padel', localidad: 'Maria Teresa', capacidad: 1 },
    { nombre: 'Santa Isabel Padel', localidad: 'Santa Isabel', capacidad: 1 },
    { nombre: 'Iriarte Padel', localidad: 'Iriarte', capacidad: 1 },
    { nombre: 'Whell Padel', localidad: 'Whell', capacidad: 1 },
    { nombre: 'Venado Tuerto Padel', localidad: 'Venado Tuerto', capacidad: 2 },
    { nombre: 'Chacabuco Padel', localidad: 'Chacabuco', capacidad: 2 },
    { nombre: 'Arenasa Padel', localidad: 'Arenasa', capacidad: 1 },
    { nombre: 'General Pintos Padel', localidad: 'General Pintos', capacidad: 1 },
    { nombre: 'Germania Padel', localidad: 'Germania', capacidad: 1 },
    { nombre: 'Firmat Padel', localidad: 'Firmat', capacidad: 1 },
    { nombre: 'Viamonte Padel', localidad: 'Viamonte', capacidad: 1 },
    { nombre: 'Tiburcio Padel', localidad: 'Tiburcio', capacidad: 1 },
    { nombre: 'Agustin Roca Padel', localidad: 'Agustin Roca', capacidad: 1 },
    { nombre: 'Alberdi Padel', localidad: 'Alberdi', capacidad: 1 },
    { nombre: 'Hugues Padel', localidad: 'Hugues', capacidad: 1 },
    { nombre: 'Las Rosas Padel', localidad: 'Las Rosas', capacidad: 1 },
  ],
  
  jugadores: {
    '8VA Damas': [
      'RODRIGUEZ TIZIANA|ARENALES', 'DIEHL FLORENCIA|ARENALES', 'RENATA AGUERO|ARENALES',
      'ANTONELA FENOGLIO|ARENALES', 'LAVAGNINO CARINA|ARENALES', 'LUCIA MEDINA|ARENALES',
      'PAGANI MARIANELA|ARENALES', 'VIOLETA MONDINO|ARENALES', 'LASERNA MELINA|ARENALES',
      'FLORENCIA APEZ|ARENALES', 'CAROLINA GONZALEZ|ARRIBEÑOS', 'MARIA HEREDIA|ARRIBEÑOS',
      'GISELA CUADRO|ARRIBEÑOS', 'VALENTINA CHIPONI|ARRIBEÑOS', 'FLAVIA SAURO|ARRIBEÑOS',
      'SUBIRADA NOELIA|ARRIBEÑOS', 'GUTIERREZ GABRIELA|ARRIBEÑOS', 'MARTINA ROMERO|ARRIBEÑOS',
      'MARISEL VALDEMORO|ARRIBEÑOS', 'MILJOVICEVICH JENNIFER|ARRIBEÑOS', 'VALDEMORO LAURA|ARRIBEÑOS',
      'GABRIELA GARCIA|ARRIBEÑOS', 'RAMBAUD YESICA|ARRIBEÑOS', 'CANTELMI BETIANA|ARRIBEÑOS',
      'DI SANTO GISELA|ASCENSION', 'PATRICIA MARTINI|ASCENSION', 'DAIANA ALVAREZ|ASCENSION',
      'ROCIO LIBORIO|ASCENSION', 'HERRERA MARIA PAULA|ASCENSION', 'GIACHELO MARILU|ASCENSION',
      'NOELIA SUAREZ|ASCENSION', 'COMINO MARIA JOSE|ASCENSION', 'ZULMA ULLUA|ASCENSION',
      'LAURA SAMORA|ASCENSION', 'CAROLINA CEJAS|ASCENSION', 'NORALI GARCIA|ASCENSION',
      'OTTONE AGUSTINA|ASCENSION', 'LUDMILA FERRE|FERRE', 'CRUZ VICTORIA|FERRE',
      'BONIFACIO MARISOL|FERRE', 'DEBORA BARROSO|FERRE', 'ERICA PAGELA|FERRE',
      'POLICANI ANA PAULA|FERRE', 'GIANCANE ALFONSINA|FERRE', 'CIELO CORONEL|FERRE',
      'QUIROGA MARIANELA|FERRE', 'ORIANA TROMBINI|FERRE', 'VILCHE DAIANA|FERRE',
      'FISHINI LARA|FERRE', 'MARTINA FUENTES|FERRE', 'LAURA SALVATORE|FERRE',
      'NATALIA GIL|FERRE', 'LORENA POLERI|FERRE', 'MARISA CALDERONE|FERRE',
      'ADRIANA VILLAFAÑE|FERRE', 'ANALIA RECAGNO|FERRE', 'GILDA DI PRINZIO|FERRE',
      'SABINA BAVA|FERRE', 'SOFIA ANDRIOLI|FERRE', 'PAULA SAYAGO|FERRE',
      'CAROLINA GAUNA|FERRE', 'DAFNE MEDINA|FERRE', 'FLORENCIA BENITEZ|FERRE',
      'HERNANDEZ ESTELA|FERRE', 'MARIA BRAVO|FERRE', 'MARTINA SANNA|FERRE',
      'NATALIA GHIOTTI|FERRE', 'VICTORIA SANNA|FERRE', 'CENTENO ELIZABETH|JUNIN',
      'FERREYRA ELIANA|JUNIN', 'VARGAS MELANY|LA ANGELITA', 'YAMILA MOHANA|LA ANGELITA',
      'FATIMA MOHANA|LA ANGELITA', 'MARCELA POLLITELO|LINCOLN', 'CINTIA CENTENO|MARIA TERESA',
      'VANESA ESTEVEZ|MARIA TERESA', 'POMPEI EVA|SANTA ISABEL', 'MARTINA PEÑA|TEODELINA',
      'MILAGROS CUBELLS|TEODELINA', 'FAGGIANI PRISCILA|V. CAÑAS', 'BRENAN GALA|VEDIA',
      'LOYOLA VANESA|VEDIA', 'ARTESI MARIANA|VEDIA'
    ],
    // Add more categories...
  }
};

function splitNombreApellido(fullName: string): { nombre: string; apellido: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length >= 2) {
    return {
      apellido: parts[0],
      nombre: parts.slice(1).join(' ')
    };
  }
  return { apellido: fullName, nombre: '' };
}

async function importData() {
  console.log('[v0] Starting data import...');
  
  try {
    // 1. Insert categories
    console.log('[v0] Inserting categories...');
    for (const cat of csvData.categorias) {
      await sql`
        INSERT INTO categorias (nombre, genero)
        VALUES (${cat.nombre}, ${cat.genero})
        ON CONFLICT (nombre) DO NOTHING
      `;
    }
    console.log('[v0] Categories inserted successfully');
    
    // 2. Insert sedes
    console.log('[v0] Inserting sedes...');
    for (const sede of csvData.sedes) {
      await sql`
        INSERT INTO sedes (nombre, localidad, capacidad_canchas, activa)
        VALUES (${sede.nombre}, ${sede.localidad}, ${sede.capacidad}, true)
        ON CONFLICT (nombre) DO NOTHING
      `;
    }
    console.log('[v0] Sedes inserted successfully');
    
    // 3. Insert players
    console.log('[v0] Inserting jugadores...');
    for (const [categoria, jugadores] of Object.entries(csvData.jugadores)) {
      // Get category ID
      const catResult = await sql`SELECT id FROM categorias WHERE nombre = ${categoria}`;
      if (catResult.length === 0) continue;
      
      const categoriaId = catResult[0].id;
      const genero = categoria.includes('Damas') ? 'femenino' : 'masculino';
      
      for (const jugadorData of jugadores) {
        const [fullName, localidad] = jugadorData.split('|');
        const { nombre, apellido } = splitNombreApellido(fullName);
        
        await sql`
          INSERT INTO jugadores (nombre, apellido, localidad, genero, categoria_actual_id, puntos_totales, estado)
          VALUES (${nombre}, ${apellido}, ${localidad}, ${genero}, ${categoriaId}, 0, 'activo')
          ON CONFLICT (nombre, apellido, localidad) DO NOTHING
        `;
      }
      
      console.log(`[v0] Inserted ${jugadores.length} players for ${categoria}`);
    }
    
    // 4. Verify
    const stats = await sql`
      SELECT 
        c.nombre AS categoria,
        COUNT(j.id) AS total_jugadores
      FROM categorias c
      LEFT JOIN jugadores j ON j.categoria_actual_id = c.id
      GROUP BY c.nombre
      ORDER BY c.nombre
    `;
    
    console.log('[v0] Import complete! Statistics:');
    console.table(stats);
    
  } catch (error) {
    console.error('[v0] Error during import:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  importData()
    .then(() => {
      console.log('[v0] Data import finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[v0] Data import failed:', error);
      process.exit(1);
    });
}

export { importData };
