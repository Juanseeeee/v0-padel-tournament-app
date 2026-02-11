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
      { ronda: '4tos', posicion: 1, p1: '1A', p2: '2C' },
      { ronda: '4tos', posicion: 2, p1: '3B', p2: '2A' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '3A' },
      { ronda: '4tos', posicion: 4, p1: '2B', p2: '1B' },
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
      { ronda: '8vos', posicion: 1, p1: '3A', p2: '2C' },
      { ronda: '8vos', posicion: 2, p1: '3B', p2: '2D' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: '2B' },
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },    // ganador(3A/2C) vs 1D
      { ronda: '4tos', posicion: 3, p1: '1C', p2: null },    // 1C vs ganador(3B/2D)
      { ronda: '4tos', posicion: 4, p1: '2A', p2: '1B' },
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
      { ronda: '8vos', posicion: 2, p1: '2D', p2: '2E' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // 1A vs ganador(2B/2C)
      { ronda: '4tos', posicion: 2, p1: '1D', p2: '1E' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '2A' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador(2D/2E) vs 1B
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  16: {
    // 4 zonas de 4: A(4), B(4), C(4), D(4) -> 12 clasificados
    zonas: [4, 4, 4, 4],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '3A', p2: '2C' },
      { ronda: '8vos', posicion: 2, p1: '3B', p2: '2D' },
      { ronda: '8vos', posicion: 3, p1: '3C', p2: '2A' },
      { ronda: '8vos', posicion: 4, p1: '3D', p2: '2B' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: null },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  17: {
    // 3 zonas de 3 + 2 zonas de 4: A(4), B(4), C(3), D(3), E(3) -> 13 clasificados
    zonas: [4, 4, 3, 3, 3],
    bracket: [
      // 8vos (pre-cuartos)
      { ronda: '8vos', posicion: 1, p1: '3A', p2: '2E' },
      { ronda: '8vos', posicion: 2, p1: '2C', p2: '2D' },
      { ronda: '8vos', posicion: 3, p1: '3B', p2: '2A' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },    // vs ganador 8vos-1
      { ronda: '4tos', posicion: 2, p1: null, p2: '1E' },    // ganador 8vos-2 vs 1E
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '1D' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },    // ganador 8vos-3 vs 1B
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  18: {
    // 6 zonas de 3: A-F -> 12 clasificados
    zonas: [3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2A', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '2C', p2: '2D' },
      { ronda: '8vos', posicion: 3, p1: '2B', p2: '2E' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '1F' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  19: {
    // 5 zonas de 3 + 1 zona de 4: A(4), B(3), C(3), D(3), E(3), F(3) -> 13 clasificados
    zonas: [4, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2A', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '3A', p2: '2D' },
      { ronda: '8vos', posicion: 3, p1: '2B', p2: '2E' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '1F' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  20: {
    // 4 zonas de 3 + 2 zonas de 4: A(4), B(4), C(3), D(3), E(3), F(3) -> 14 clasificados
    zonas: [4, 4, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2A', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '3A', p2: '2D' },
      { ronda: '8vos', posicion: 3, p1: '2B', p2: '2E' },
      { ronda: '8vos', posicion: 4, p1: '3B', p2: '2C' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '1F' },
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
    zonas: [3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '2A', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '2C', p2: '2D' },
      { ronda: '8vos', posicion: 3, p1: '2B', p2: '2E' },
      { ronda: '8vos', posicion: 4, p1: '2G', p2: '1E' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '1F' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  22: {
    // 6 zonas de 3 + 1 zona de 4: A(4), B(3), C(3), D(3), E(3), F(3), G(3) -> 15 clasificados
    zonas: [4, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '3A', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '2C', p2: '2D' },
      { ronda: '8vos', posicion: 3, p1: '2G', p2: '1E' },
      { ronda: '8vos', posicion: 4, p1: '2B', p2: '2E' },
      // 4tos
      { ronda: '4tos', posicion: 1, p1: '1A', p2: null },
      { ronda: '4tos', posicion: 2, p1: null, p2: '1D' },
      { ronda: '4tos', posicion: 3, p1: '1C', p2: '1F' },
      { ronda: '4tos', posicion: 4, p1: null, p2: '1B' },
      // Semis
      { ronda: 'semis', posicion: 1, p1: null, p2: null },
      { ronda: 'semis', posicion: 2, p1: null, p2: null },
      // Final
      { ronda: 'final', posicion: 1, p1: null, p2: null },
    ],
  },

  23: {
    // 5 zonas de 3 + 2 zonas de 4: A(4), B(4), C(3), D(3), E(3), F(3), G(3) -> 16 clasificados
    zonas: [4, 4, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos completos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: '2G' },
      { ronda: '8vos', posicion: 2, p1: '2C', p2: '1F' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2D' },
      { ronda: '8vos', posicion: 4, p1: '3A', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2E' },
      { ronda: '8vos', posicion: 6, p1: '2F', p2: '1G' },
      { ronda: '8vos', posicion: 7, p1: '3B', p2: '2A' },
      { ronda: '8vos', posicion: 8, p1: '2B', p2: '1B' },
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
    zonas: [3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 8vos completos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: '2D' },
      { ronda: '8vos', posicion: 2, p1: '2G', p2: '1F' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2H' },
      { ronda: '8vos', posicion: 4, p1: '2C', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2F' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '1H' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '2B' },
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
    // 7 zonas de 3 + 1 zona de 4: A(4), B(3), C(3), D(3), E(3), F(3), G(3), H(3) -> 17 clasificados
    zonas: [4, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // Pre-8vos
      { ronda: '16avos', posicion: 1, p1: '3A', p2: '2B' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },    // vs ganador 16avos
      { ronda: '8vos', posicion: 2, p1: '2G', p2: '1F' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2H' },
      { ronda: '8vos', posicion: 4, p1: '2C', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2F' },
      { ronda: '8vos', posicion: 6, p1: '2E', p2: '1H' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '2D' },
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

  27: {
    // 9 zonas de 3: A-I -> 18 clasificados
    zonas: [3, 3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // Pre-8vos
      { ronda: '16avos', posicion: 1, p1: '2B', p2: '2C' },
      { ronda: '16avos', posicion: 2, p1: '2I', p2: '2D' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: '1I', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2G' },
      { ronda: '8vos', posicion: 4, p1: '2F', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2E' },
      { ronda: '8vos', posicion: 6, p1: '2H', p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: null },
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

  28: {
    // 8 zonas de 3 + 1 zona de 4: A(4), B(3)x8... wait - 28/3 = 9r1 -> 7 zonas de 3 + 1 zona de 4 + adjust
    // Actually from PDF D28: 9 zonas (A-I), A(4), B(4), rest 3
    zonas: [4, 4, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // Pre-8vos
      { ronda: '16avos', posicion: 1, p1: '3A', p2: '2B' },
      { ronda: '16avos', posicion: 2, p1: '2I', p2: '2D' },
      { ronda: '16avos', posicion: 3, p1: '3B', p2: '2A' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: '1I', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2G' },
      { ronda: '8vos', posicion: 4, p1: null, p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2E' },
      { ronda: '8vos', posicion: 6, p1: '2H', p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: null },
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

  29: {
    // From PDF D29: 3ra caballeros. A(4), B(4), zonas C-I de 3 = 9 zonas
    zonas: [4, 4, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 16avos
      { ronda: '16avos', posicion: 1, p1: '2B', p2: '2C' },
      { ronda: '16avos', posicion: 2, p1: '2F', p2: '2G' },
      { ronda: '16avos', posicion: 3, p1: '3B', p2: '2A' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: '1I', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: null },
      { ronda: '8vos', posicion: 4, p1: '3A', p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: '2E' },
      { ronda: '8vos', posicion: 6, p1: '2H', p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '2I' },
      { ronda: '8vos', posicion: 8, p1: '2D', p2: '1B' },
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

  30: {
    // 10 zonas de 3: A-J -> 20 clasificados
    zonas: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 16avos
      { ronda: '16avos', posicion: 1, p1: '2C', p2: '2F' },
      { ronda: '16avos', posicion: 2, p1: '2G', p2: '2B' },
      { ronda: '16avos', posicion: 3, p1: '2A', p2: '2H' },
      { ronda: '16avos', posicion: 4, p1: '2I', p2: '2D' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: '1I', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2J' },
      { ronda: '8vos', posicion: 4, p1: null, p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: null },
      { ronda: '8vos', posicion: 6, p1: null, p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '1J' },
      { ronda: '8vos', posicion: 8, p1: '2E', p2: '1B' },
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

  31: {
    // 9 zonas de 3 + 1 zona de 4: A(4), B-J(3) = 10 zonas -> 21 clasificados
    zonas: [4, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 16avos
      { ronda: '16avos', posicion: 1, p1: '2C', p2: '2F' },
      { ronda: '16avos', posicion: 2, p1: '2G', p2: '2B' },
      { ronda: '16avos', posicion: 3, p1: '2A', p2: '2H' },
      { ronda: '16avos', posicion: 4, p1: '2I', p2: '3A' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: '1I', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: '2J' },
      { ronda: '8vos', posicion: 4, p1: null, p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: null },
      { ronda: '8vos', posicion: 6, p1: null, p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '1J' },
      { ronda: '8vos', posicion: 8, p1: '2E', p2: '1B' },
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

  32: {
    // 8 zonas de 3 + 2 zonas de 4: A(4), B(4), C-J(3) = 10 zonas -> 22 clasificados
    zonas: [4, 4, 3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 16avos
      { ronda: '16avos', posicion: 1, p1: '3B', p2: '2C' },
      { ronda: '16avos', posicion: 2, p1: '2G', p2: '2B' },
      { ronda: '16avos', posicion: 3, p1: '2A', p2: '2H' },
      { ronda: '16avos', posicion: 4, p1: '2I', p2: '3A' },
      { ronda: '16avos', posicion: 5, p1: '2D', p2: '2I' },
      { ronda: '16avos', posicion: 6, p1: '1K', p2: '2A' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: '2F' },
      { ronda: '8vos', posicion: 2, p1: '2G', p2: '1H' },
      { ronda: '8vos', posicion: 3, p1: '1E', p2: null },
      { ronda: '8vos', posicion: 4, p1: null, p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: null },
      { ronda: '8vos', posicion: 6, p1: null, p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: null },
      { ronda: '8vos', posicion: 8, p1: '2E', p2: '1B' },
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

  33: {
    // 11 zonas de 3: A-K -> 22 clasificados
    zonas: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 16avos
      { ronda: '16avos', posicion: 1, p1: '2F', p2: '2G' },
      { ronda: '16avos', posicion: 2, p1: '2B', p2: '2K' },
      { ronda: '16avos', posicion: 3, p1: '2J', p2: '2C' },
      { ronda: '16avos', posicion: 4, p1: '2D', p2: '2I' },
      { ronda: '16avos', posicion: 5, p1: '1K', p2: '2A' },
      { ronda: '16avos', posicion: 6, p1: '2H', p2: '2E' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: null, p2: '1I' },
      { ronda: '8vos', posicion: 3, p1: '1H', p2: '1E' },
      { ronda: '8vos', posicion: 4, p1: null, p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: null },
      { ronda: '8vos', posicion: 6, p1: null, p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: '1J' },
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

  34: {
    // 10 zonas de 3 + 1 zona de 4: A(4), B-K(3) = 11 zonas -> 23 clasificados
    zonas: [4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 16avos
      { ronda: '16avos', posicion: 1, p1: '2F', p2: '2G' },
      { ronda: '16avos', posicion: 2, p1: '2B', p2: '2K' },
      { ronda: '16avos', posicion: 3, p1: '2J', p2: '2C' },
      { ronda: '16avos', posicion: 4, p1: '2D', p2: '2I' },
      { ronda: '16avos', posicion: 5, p1: '1K', p2: '2A' },
      { ronda: '16avos', posicion: 6, p1: '2H', p2: '2E' },
      { ronda: '16avos', posicion: 7, p1: '3A', p2: '1J' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: null, p2: '1I' },
      { ronda: '8vos', posicion: 3, p1: '1H', p2: '1E' },
      { ronda: '8vos', posicion: 4, p1: null, p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: null },
      { ronda: '8vos', posicion: 6, p1: null, p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: null },
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

  35: {
    // 9 zonas de 3 + 2 zonas de 4: A(4), B(4), C-K(3) = 11 zonas -> 24 clasificados
    zonas: [4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    bracket: [
      // 16avos
      { ronda: '16avos', posicion: 1, p1: '2F', p2: '2G' },
      { ronda: '16avos', posicion: 2, p1: '2B', p2: '2K' },
      { ronda: '16avos', posicion: 3, p1: '2J', p2: '2C' },
      { ronda: '16avos', posicion: 4, p1: '2D', p2: '2I' },
      { ronda: '16avos', posicion: 5, p1: '1K', p2: '2A' },
      { ronda: '16avos', posicion: 6, p1: '2H', p2: '2E' },
      { ronda: '16avos', posicion: 7, p1: '3B', p2: '2A' },
      { ronda: '16avos', posicion: 8, p1: '3A', p2: '1J' },
      // 8vos
      { ronda: '8vos', posicion: 1, p1: '1A', p2: null },
      { ronda: '8vos', posicion: 2, p1: null, p2: '1I' },
      { ronda: '8vos', posicion: 3, p1: '1H', p2: '1E' },
      { ronda: '8vos', posicion: 4, p1: null, p2: '1D' },
      { ronda: '8vos', posicion: 5, p1: '1C', p2: null },
      { ronda: '8vos', posicion: 6, p1: null, p2: '1F' },
      { ronda: '8vos', posicion: 7, p1: '1G', p2: null },
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

// Obtener las letras de zonas dado un config
export const ZONA_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Helper: dado un slot como "1A", "2B", "3C" parsea posición y zona
export function parseSlot(slot: string): { posicion: number; zonaLetra: string } {
  const posicion = parseInt(slot.charAt(0));
  const zonaLetra = slot.substring(1);
  return { posicion, zonaLetra };
}

// Helper: obtener el orden de rondas
export const RONDAS_ORDER = ['16avos', '8vos', '4tos', 'semis', 'final'];

// Helper: determinar la siguiente ronda y posición
export function getNextMatch(
  ronda: string,
  posicion: number
): { nextRonda: string; nextPosicion: number; asP1: boolean } | null {
  const rondaIdx = RONDAS_ORDER.indexOf(ronda);
  if (rondaIdx === -1 || rondaIdx >= RONDAS_ORDER.length - 1) return null;
  const nextRonda = RONDAS_ORDER[rondaIdx + 1];
  const nextPosicion = Math.ceil(posicion / 2);
  const asP1 = posicion % 2 === 1;
  return { nextRonda, nextPosicion, asP1 };
}
