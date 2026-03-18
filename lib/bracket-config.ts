// Configuración de brackets extraída de los PDFs oficiales de la liga.
// Para cada cantidad de parejas (6-35), define:
//   zonas: distribución de zonas (3=zona de 3, 4=zona de 4)
//   bracket: array de llaves por ronda. Cada llave tiene [p1, p2] donde
//     p1/p2 usa notación: "1A" = 1ro zona A, "2B" = 2do zona B, "3A" = 3ro zona A
//     null = se completa con ganador de llave anterior (bye si solo hay una pareja)
//   rondas: nombres de las rondas en orden

export type BracketSlot = string | null; // "1A", "2B", "3A", etc. o null (viene de llave anterior)

export type BracketMatch = {
  ronda: string;
  posicion: number;
  p1: BracketSlot;
  p2: BracketSlot;
};

export type TournamentConfig = {
  zonas: number[]; // [3, 3] = 2 zonas de 3, [4, 3] = 1 zona de 4 + 1 de 3
  bracket: BracketMatch[];
};

export const RONDAS_ORDER = ['32avos', '16avos', '8vos', '4tos', 'semis', 'final'];
// Force rebuild

export const ZONA_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Mapa de configuraciones por cantidad de parejas
export const BRACKET_CONFIGS: Record<number, TournamentConfig> = {
  6: {
    // 2 zonas de 3: A(3), B(3) -> 4 clasificados
    zonas: [3, 3],
    bracket: [
      // Semis
      { ronda: 'semis', posicion: 1, p1: '1A', p2: '2B' },
      { ronda: 'semis', posicion: 2, p1: '2A', p2: '1B' },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  7: {
    // 1 zona de 4 + 1 zona de 3: A(4), B(3) -> 5 clasificados
    zonas: [4, 3],
    bracket: [
      // 4tos (solo 1 partido: 3ro de A vs 2do de B)
      { ronda: '4tos', posicion: 1, p1: '3A', p2: '2B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: '1A', p2: null },   // 1oA vs ganador 4tos
      { ronda: 'semis', posicion: 2, p1: '2A', p2: '1B' },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  8: {
    // 2 zonas de 4: A(4), B(4) -> 6 clasificados
    zonas: [4, 4],
    bracket: [
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '3A', p2: '2B' },
      { ronda: '4tos', posicion: 2, p1: '3B', p2: '2A' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: '1A', p2: null },   // 1oA vs ganador(3B/2A)
      { ronda: 'semis', posicion: 2, p1: null, p2: '1B' },   // ganador(3A/2B) vs 1oB
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  9: {
    // 3 zonas de 3: A(3), B(3), C(3) -> 6 clasificados
    zonas: [3, 3, 3],
    bracket: [
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: '2C' },
      { ronda: '4tos', posicion: 2, p1: '2A', p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: '1C' },   // ganador(1A/2C) vs 1C
      { ronda: 'semis', posicion: 2, p1: null, p2: '2B' },   // ganador(2A/1B) vs 2B
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  10: {
    // 2 zonas de 3 + 1 zona de 4: A(4), B(3), C(3) -> 7 clasificados
    zonas: [4, 3, 3],
    bracket: [
      // Pre-4tos (3oA vs 2oC)
      { ronda: '8vos', posicion: 1, p1: '3A', p2: '2C' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: '2B' },
      { ronda: '4tos', posicion: 2, p1: '1C', p2: '2A' },
      { ronda: '4tos', posicion: 3, p1: null, p2: '1B' },   // ganador(3A/2C) vs 1B
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },   // ganador 4tos-1 vs ganador 4tos-2
      { ronda: 'semis', posicion: 2, p1: null, p2: null },   // ganador 4tos-3 (solo si hay 4to 4tos)
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  11: {
    // 1 zona de 3 + 2 zonas de 4: A(4), B(4), C(3) -> 8 clasificados
    zonas: [4, 4, 3],
    bracket: [
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: '3B' },
      { ronda: '4tos', posicion: 2, p1: '2B', p2: '2C' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '2A' },
      { ronda: '4tos', posicion: 4, p1: '3A', p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  12: {
    // 4 zonas de 3: A(3), B(3), C(3), D(3) -> 8 clasificados
    zonas: [3, 3, 3, 3],
    bracket: [
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: '2B' },
      { ronda: '4tos', posicion: 2, p1: '2C', p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '2D' },
      { ronda: '4tos', posicion: 4, p1: '2A', p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  13: {
    // 3 zonas de 3 + 1 zona de 4: A(4), B(3), C(3), D(3) -> 9 clasificados
    zonas: [4, 3, 3, 3],
    bracket: [
      // Pre-4tos
      { ronda: '8vos', posicion: 1, p1: '3A', p2: '2B' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // vs ganador(3A/2B)
      { ronda: '4tos', posicion: 2, p1: '2C', p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '2D' },
      { ronda: '4tos', posicion: 4, p1: '2A', p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  14: {
    // 2 zonas de 3 + 2 zonas de 4: A(4), B(4), C(3), D(3) -> 10 clasificados
    zonas: [4, 4, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '3A', p2: '2B' },
      { ronda: '8vos', posicion: 2, p1: '2A', p2: '3B' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // ganador(3A/2B)
      { ronda: '4tos', posicion: 2, p1: '2C', p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '2D' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador(2A/3B)
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  15: {
    // 5 zonas de 3: A(3), B(3), C(3), D(3), E(3) -> 10 clasificados
    zonas: [3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2B', p2: '2C' },
      { ronda: '8vos', posicion: 2, p1: '2D', p2: '2A' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // ganador(2B/2C)
      { ronda: '4tos', posicion: 2, p1: '1E', p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '2E' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador(2D/2A)
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  16: {
    // 1 zona de 4 + 4 zonas de 3: A(4), B(3), C(3), D(3), E(3) -> 11 clasificados
    zonas: [4, 3, 3, 3, 3],
    bracket: [
      // 8vos (3 partidos)
      { ronda: '8vos', posicion: 1, p1: '2B', p2: '2C' },
      { ronda: '8vos', posicion: 2, p1: '3A', p2: '2E' },
      { ronda: '8vos', posicion: 3, p1: '2D', p2: '2A' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // vs ganador(2B/2C)
      { ronda: '4tos', posicion: 2, p1: '1E', p2: '1D' },    // 1E vs 1D
      { ronda: '4tos', posicion: 3, p1: '1C', p2: null },    // vs ganador(3A/2E)
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador(2D/2A) vs 1B
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  17: {
    // 2 zonas de 4 + 3 zonas de 3: A(4), B(4), C(3), D(3), E(3) -> 12 clasificados
    // Estructura similar a 16 (12 clasificados)
    zonas: [4, 4, 3, 3, 3],
    bracket: [
      // 8vos (4 partidos)
      { ronda: '8vos', posicion: 1, p1: '2B', p2: '2C' },
      { ronda: '8vos', posicion: 2, p1: '1E', p2: '3B' },
      { ronda: '8vos', posicion: 3, p1: '3A', p2: '2E' },
      { ronda: '8vos', posicion: 4, p1: '2D', p2: '2A' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // ganador(2B/2C)
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },    // ganador(1E/3B) vs 1D
      { ronda: '4tos', posicion: 3, p1: '1C', p2: null },    // ganador(3A/2E)
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador(2D/2A)
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  18: {
    // 6 zonas de 3: A(3), B(3), C(3), D(3), E(3), F(3) -> 14 clasificados
    zonas: [3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2C', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '1E', p2: '2B' },
      { ronda: '8vos', posicion: 3, p1: '3A', p2: '1D' },
      { ronda: '8vos', posicion: 4, p1: '1C', p2: '3B' },
      { ronda: '8vos', posicion: 5, p1: '2A', p2: '1F' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '2D' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // ganador(2C/2F)
      { ronda: '4tos', posicion: 2, p1: null, p2: null },    // ganador(1E/2B) vs ganador(3A/1D)
      { ronda: '4tos', posicion: 3, p1: null, p2: null },    // ganador(1C/3B) vs ganador(2A/1F)
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador(2E/2D)
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  19: {
    // 1 zona de 4 + 5 zonas de 3: A(4), B(3), C(3), D(3), E(3), F(3) -> 14 clasificados
    zonas: [4, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2C', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '1E', p2: '2B' },
      { ronda: '8vos', posicion: 3, p1: '3A', p2: '1D' },
      { ronda: '8vos', posicion: 4, p1: '1C', p2: '3B' },
      { ronda: '8vos', posicion: 5, p1: '2A', p2: '1F' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '2D' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: null },
      { ronda: '4tos', posicion: 3, p1: null, p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  20: {
    // 2 zonas de 4 + 4 zonas de 3: A(4), B(4), C(3), D(3), E(3), F(3) -> 14 clasificados
    // Estructura similar a 19 (14 clasificados)
    zonas: [4, 4, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2C', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '1E', p2: '2B' },
      { ronda: '8vos', posicion: 3, p1: '3A', p2: '1D' },
      { ronda: '8vos', posicion: 4, p1: '1C', p2: '3B' },
      { ronda: '8vos', posicion: 5, p1: '2A', p2: '1F' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '2D' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: null },
      { ronda: '4tos', posicion: 3, p1: null, p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  21: {
    // 7 zonas de 3: A-G -> 14 clasificados
    // Estructura "Damas 5ta"
    zonas: [3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos (6 partidos)
      { ronda: '8vos', posicion: 1, p1: '2F', p2: '2G' },
      { ronda: '8vos', posicion: 2, p1: '1E', p2: '2C' },
      { ronda: '8vos', posicion: 3, p1: '2B', p2: '1D' },
      { ronda: '8vos', posicion: 4, p1: '1C', p2: '2A' },
      { ronda: '8vos', posicion: 5, p1: '2D', p2: '1F' },
      { ronda: '8vos', posicion: 6, p1: '1G', p2: '2E' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // ganador(2F/2G)
      { ronda: '4tos', posicion: 2, p1: null, p2: null },    // ganador(1E/2C) vs ganador(2B/1D)
      { ronda: '4tos', posicion: 3, p1: null, p2: null },    // ganador(1C/2A) vs ganador(2D/1F)
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador(1G/2E)
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  22: {
    // 1 zona de 4 + 6 zonas de 3: A(4), B-G(3) -> 14 clasificados
    // Estructura "Ladies 4ta" (Idéntica a 21)
    zonas: [4, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2F', p2: '2G' },
      { ronda: '8vos', posicion: 2, p1: '1E', p2: '2C' },
      { ronda: '8vos', posicion: 3, p1: '2B', p2: '1D' },
      { ronda: '8vos', posicion: 4, p1: '1C', p2: '2A' },
      { ronda: '8vos', posicion: 5, p1: '2D', p2: '1F' },
      { ronda: '8vos', posicion: 6, p1: '1G', p2: '2E' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: null },
      { ronda: '4tos', posicion: 3, p1: null, p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  23: {
    // 2 zonas de 4 + 5 zonas de 3: A(4), B(4), C-G(3) -> 16 clasificados
    // Estructura "Sub. 16 C"
    zonas: [4, 4, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos (8 partidos)
      { ronda: '8vos', posicion: 1, p1: '1A', p2: '3B' },
      { ronda: '8vos', posicion: 2, p1: '2F', p2: '2G' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2C' },
      { ronda: '8vos', posicion: 4, p1: '2B', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2A' },
      { ronda: '8vos', posicion: 6, p1: '2D', p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '2E' },
      { ronda: '8vos', posicion: 8, p1: '3A', p2: '1B' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: null, p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: null },
      { ronda: '4tos', posicion: 3, p1: null, p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: null },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  24: {
    // 8 zonas de 3: A-H -> 16 clasificados
    // Estructura "16 D"
    zonas: [3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos (8 partidos)
      { ronda: '8vos', posicion: 1, p1: '1A', p2: '2B' },
      { ronda: '8vos', posicion: 2, p1: '2G', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2F' },
      { ronda: '8vos', posicion: 4, p1: '2C', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2D' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '2H' },
      { ronda: '8vos', posicion: 8, p1: '2A', p2: '1B' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: null, p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: null },
      { ronda: '4tos', posicion: 3, p1: null, p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: null },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  25: {
    // 1 zona de 4 + 7 zonas de 3: A(4), B-H(3) -> 16 clasificados
    // Misma estructura que 24
    zonas: [4, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: '2B' },
      { ronda: '8vos', posicion: 2, p1: '2G', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2F' },
      { ronda: '8vos', posicion: 4, p1: '2C', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2D' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '2H' },
      { ronda: '8vos', posicion: 8, p1: '2A', p2: '1B' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: null, p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: null },
      { ronda: '4tos', posicion: 3, p1: null, p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: null },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  26: {
    // 6 zonas de 3 + 2 zonas de 4: A(4), B(4), C(3), D(3), E(3), F(3), G(3), H(3) -> 18 clasificados
    zonas: [4, 4, 3, 3, 3, 3, 3, 3],
    bracket: [
      // Pre-8vos
      { ronda: '16avos', posicion: 1, p1: '3A', p2: '2B' },
      { ronda: '16avos', posicion: 2, p1: '3B', p2: '2A' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: '2G', p2: '1F' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2H' },
      { ronda: '8vos', posicion: 4, p1: '2C', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2F' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '1H' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '2D' },
      { ronda: '8vos', posicion: 8, p1: null, p2: '1B' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: null, p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: null },
      { ronda: '4tos', posicion: 3, p1: null, p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: null },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },
};
