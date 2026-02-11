-- Mejoras al sistema de zonas

-- Agregar columnas necesarias a partidos_zona
ALTER TABLE partidos_zona ADD COLUMN IF NOT EXISTS orden_partido INTEGER DEFAULT 1;
ALTER TABLE partidos_zona ADD COLUMN IF NOT EXISTS tipo_partido VARCHAR(30); -- 'inicial', 'perdedores', 'ganadores', 'definicion'
ALTER TABLE partidos_zona ADD COLUMN IF NOT EXISTS partido_anterior_id INTEGER REFERENCES partidos_zona(id);

-- Agregar columna de estado a zonas
ALTER TABLE zonas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activa'; -- 'activa', 'cerrada'
ALTER TABLE zonas ADD COLUMN IF NOT EXISTS formato INTEGER DEFAULT 3; -- 3 o 4 parejas

-- Agregar posicion inicial a parejas_zona
ALTER TABLE parejas_zona ADD COLUMN IF NOT EXISTS posicion_inicial INTEGER;

-- Crear índice para orden de partidos
CREATE INDEX IF NOT EXISTS idx_partidos_zona_orden ON partidos_zona(zona_id, orden_partido);
