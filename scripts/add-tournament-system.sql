-- Sistema completo de gestión de torneos con zonas y llaves

-- Parejas inscritas en un torneo/fecha
CREATE TABLE IF NOT EXISTS parejas_torneo (
  id SERIAL PRIMARY KEY,
  fecha_torneo_id INTEGER REFERENCES fechas_torneo(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categorias(id),
  jugador1_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
  jugador2_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
  numero_pareja INTEGER, -- Número asignado en el torneo
  cabeza_serie BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fecha_torneo_id, categoria_id, jugador1_id, jugador2_id)
);

-- Zonas del torneo
CREATE TABLE IF NOT EXISTS zonas (
  id SERIAL PRIMARY KEY,
  fecha_torneo_id INTEGER REFERENCES fechas_torneo(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categorias(id),
  nombre VARCHAR(50) NOT NULL, -- "Zona A", "Zona B", etc.
  tipo VARCHAR(20) DEFAULT 'grupos', -- 'grupos' (3 o 4 parejas)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parejas asignadas a zonas
CREATE TABLE IF NOT EXISTS parejas_zona (
  id SERIAL PRIMARY KEY,
  zona_id INTEGER REFERENCES zonas(id) ON DELETE CASCADE,
  pareja_id INTEGER REFERENCES parejas_torneo(id) ON DELETE CASCADE,
  posicion_final INTEGER, -- 1, 2, 3 o 4 al finalizar la zona
  partidos_ganados INTEGER DEFAULT 0,
  partidos_perdidos INTEGER DEFAULT 0,
  sets_ganados INTEGER DEFAULT 0,
  sets_perdidos INTEGER DEFAULT 0,
  games_ganados INTEGER DEFAULT 0,
  games_perdidos INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(zona_id, pareja_id)
);

-- Partidos de fase de grupos (zona)
CREATE TABLE IF NOT EXISTS partidos_zona (
  id SERIAL PRIMARY KEY,
  zona_id INTEGER REFERENCES zonas(id) ON DELETE CASCADE,
  pareja1_id INTEGER REFERENCES parejas_torneo(id) ON DELETE CASCADE,
  pareja2_id INTEGER REFERENCES parejas_torneo(id) ON DELETE CASCADE,
  set1_pareja1 INTEGER,
  set1_pareja2 INTEGER,
  set2_pareja1 INTEGER,
  set2_pareja2 INTEGER,
  set3_pareja1 INTEGER, -- Super tie break si aplica
  set3_pareja2 INTEGER,
  ganador_id INTEGER REFERENCES parejas_torneo(id),
  fecha_hora_programada TIMESTAMP,
  cancha_numero INTEGER,
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, en_juego, finalizado
  created_at TIMESTAMP DEFAULT NOW()
);

-- Llaves/Brackets del torneo
CREATE TABLE IF NOT EXISTS llaves (
  id SERIAL PRIMARY KEY,
  fecha_torneo_id INTEGER REFERENCES fechas_torneo(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categorias(id),
  ronda VARCHAR(20) NOT NULL, -- '16avos', '8vos', '4tos', 'semis', 'final'
  posicion INTEGER NOT NULL, -- Posición en la ronda (1, 2, 3, etc.)
  pareja1_id INTEGER REFERENCES parejas_torneo(id),
  pareja2_id INTEGER REFERENCES parejas_torneo(id),
  set1_pareja1 INTEGER,
  set1_pareja2 INTEGER,
  set2_pareja1 INTEGER,
  set2_pareja2 INTEGER,
  set3_pareja1 INTEGER,
  set3_pareja2 INTEGER,
  ganador_id INTEGER REFERENCES parejas_torneo(id),
  fecha_hora_programada TIMESTAMP,
  cancha_numero INTEGER,
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, en_juego, finalizado
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fecha_torneo_id, categoria_id, ronda, posicion)
);

-- Configuración del torneo por categoría
CREATE TABLE IF NOT EXISTS config_torneo (
  id SERIAL PRIMARY KEY,
  fecha_torneo_id INTEGER REFERENCES fechas_torneo(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categorias(id),
  formato_zona INTEGER DEFAULT 3, -- 3 o 4 parejas por zona
  duracion_partido_min INTEGER DEFAULT 60, -- Minutos estimados por partido
  dias_torneo INTEGER DEFAULT 3, -- Viernes, Sábado, Domingo
  ronda_inicial VARCHAR(20), -- '16avos', '8vos', '4tos' según cantidad parejas
  estado VARCHAR(20) DEFAULT 'inscripcion', -- inscripcion, zonas, llaves, finalizado
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fecha_torneo_id, categoria_id)
);

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_parejas_torneo_fecha ON parejas_torneo(fecha_torneo_id);
CREATE INDEX IF NOT EXISTS idx_parejas_torneo_categoria ON parejas_torneo(categoria_id);
CREATE INDEX IF NOT EXISTS idx_zonas_fecha ON zonas(fecha_torneo_id);
CREATE INDEX IF NOT EXISTS idx_llaves_fecha ON llaves(fecha_torneo_id);
CREATE INDEX IF NOT EXISTS idx_partidos_zona ON partidos_zona(zona_id);
