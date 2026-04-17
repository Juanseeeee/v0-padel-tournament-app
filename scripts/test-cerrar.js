const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const torneoId = 63;
  const categoriaId = 25;

  const llaves = await sql`
    SELECT l.*, 
      pt1.jugador1_id as p1_j1, pt1.jugador2_id as p1_j2,
      pt2.jugador1_id as p2_j1, pt2.jugador2_id as p2_j2
    FROM llaves l
    LEFT JOIN parejas_torneo pt1 ON pt1.id = l.pareja1_id
    LEFT JOIN parejas_torneo pt2 ON pt2.id = l.pareja2_id
    WHERE l.fecha_torneo_id = ${torneoId}
      AND l.categoria_id = ${categoriaId}
    ORDER BY 
      CASE l.ronda 
        WHEN 'final' THEN 5 
        WHEN 'semis' THEN 4 
        WHEN '4tos' THEN 3 
        WHEN '8vos' THEN 2 
        WHEN '16avos' THEN 1 
      END DESC
  `;

  const jugadorInstancia = {};
  const setInstancia = (jugadorId, instancia) => {
    if (!jugadorId) return;
    if (!jugadorInstancia[jugadorId]) {
      jugadorInstancia[jugadorId] = instancia;
    }
  };

  for (const llave of llaves) {
    if (llave.estado !== 'finalizado') continue;

    // Simulate strict equality check
    const ganadorPareja = llave.ganador_id === llave.pareja1_id 
      ? { j1: llave.p1_j1, j2: llave.p1_j2 }
      : { j1: llave.p2_j1, j2: llave.p2_j2 };
    
    const perdedorPareja = llave.ganador_id === llave.pareja1_id
      ? { j1: llave.p2_j1, j2: llave.p2_j2 }
      : { j1: llave.p1_j1, j2: llave.p1_j2 };

    console.log(`Ronda: ${llave.ronda}, Pareja1: ${llave.pareja1_id}, Pareja2: ${llave.pareja2_id}, Ganador: ${llave.ganador_id}`);
    console.log(`GanadorPareja:`, ganadorPareja, `PerdedorPareja:`, perdedorPareja);

    if (llave.ronda === 'final') {
      setInstancia(ganadorPareja.j1, 'campeon');
      setInstancia(ganadorPareja.j2, 'campeon');
      setInstancia(perdedorPareja.j1, 'finalista');
      setInstancia(perdedorPareja.j2, 'finalista');
    } else if (llave.ronda === 'semis') {
      setInstancia(perdedorPareja.j1, 'semifinalista');
      setInstancia(perdedorPareja.j2, 'semifinalista');
    } else if (llave.ronda === '4tos') {
      setInstancia(perdedorPareja.j1, 'cuartofinalista');
      setInstancia(perdedorPareja.j2, 'cuartofinalista');
    } else if (llave.ronda === '8vos') {
      setInstancia(perdedorPareja.j1, 'octavofinalista');
      setInstancia(perdedorPareja.j2, 'octavofinalista');
    }
  }

  console.log('Jugador Instancia:', jugadorInstancia);
}
run().catch(console.error);