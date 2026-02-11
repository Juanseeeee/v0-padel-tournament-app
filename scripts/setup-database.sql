-- Liga de Padel Database Schema

-- Categorías (niveles de competición)
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  orden_nivel INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Jugadores
CREATE TABLE IF NOT EXISTS jugadores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  localidad VARCHAR(200),
  genero VARCHAR(20) DEFAULT 'masculino',
  categoria_actual_id INTEGER REFERENCES categorias(id),
  puntos_totales INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fechas del torneo (12 fechas por temporada)
CREATE TABLE IF NOT EXISTS fechas_torneo (
  id SERIAL PRIMARY KEY,
  numero_fecha INTEGER NOT NULL CHECK (numero_fecha BETWEEN 1 AND 12),
  fecha_calendario DATE NOT NULL,
  sede VARCHAR(200) NOT NULL,
  direccion VARCHAR(300),
  estado VARCHAR(20) DEFAULT 'programada', -- programada, en_juego, finalizada
  temporada INTEGER DEFAULT 2025,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Configuración de puntos por instancia
CREATE TABLE IF NOT EXISTS puntos_configuracion (
  id SERIAL PRIMARY KEY,
  instancia VARCHAR(50) NOT NULL UNIQUE,
  puntos INTEGER NOT NULL,
  orden INTEGER NOT NULL
);

-- Participación de jugadores en cada fecha
CREATE TABLE IF NOT EXISTS participaciones (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha_torneo_id INTEGER REFERENCES fechas_torneo(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categorias(id),
  instancia_alcanzada VARCHAR(50), -- zona, 16avos, 8vos, 4tos, semis, finalista, campeon
  puntos_obtenidos INTEGER DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(jugador_id, fecha_torneo_id)
);

-- Historial de puntos (tracking completo)
CREATE TABLE IF NOT EXISTS historial_puntos (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categorias(id),
  fecha_torneo_id INTEGER REFERENCES fechas_torneo(id),
  puntos_acumulados INTEGER NOT NULL,
  motivo VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ascensos de categoría
CREATE TABLE IF NOT EXISTS ascensos (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha_ascenso DATE NOT NULL,
  categoria_origen_id INTEGER REFERENCES categorias(id),
  categoria_destino_id INTEGER REFERENCES categorias(id),
  puntos_origen INTEGER NOT NULL,
  puntos_transferidos INTEGER NOT NULL, -- la mitad
  created_at TIMESTAMP DEFAULT NOW()
);

-- Informes/Comunicados de la liga
CREATE TABLE IF NOT EXISTS informes (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(300) NOT NULL,
  contenido TEXT NOT NULL,
  fecha_publicacion TIMESTAMP DEFAULT NOW(),
  archivo_adjunto_url VARCHAR(500),
  categoria_relacionada_id INTEGER REFERENCES categorias(id),
  etiquetas VARCHAR(200), -- "reglamento", "comunicado", etc.
  publicado BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios admin (autenticación simple)
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración de puntos por defecto
INSERT INTO puntos_configuracion (instancia, puntos, orden) VALUES
  ('zona', 10, 1),
  ('16avos', 20, 2),
  ('8vos', 30, 3),
  ('4tos', 40, 4),
  ('semis', 60, 5),
  ('finalista', 80, 6),
  ('campeon', 100, 7)
ON CONFLICT (instancia) DO NOTHING;

-- Insertar categorías de ejemplo
INSERT INTO categorias (nombre, orden_nivel) VALUES
  ('1era Caballeros', 1),
  ('2da Caballeros', 2),
  ('3era Caballeros', 3),
  ('4ta Caballeros', 4),
  ('5ta Caballeros', 5),
  ('1era Damas', 1),
  ('2da Damas', 2),
  ('3era Damas', 3),
  ('Suma 8 Mixto', 4),
  ('Suma 10 Mixto', 5)
ON CONFLICT DO NOTHING;
