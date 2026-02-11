-- Table for many-to-many relationship between jugadores and categorias
CREATE TABLE IF NOT EXISTS jugador_categorias (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(jugador_id, categoria_id)
);

-- Add genero column to categorias if it doesn't exist
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS genero VARCHAR(20) DEFAULT 'mixto';

-- Update genero based on category names
UPDATE categorias SET genero = 'masculino' WHERE LOWER(nombre) LIKE '%caballero%';
UPDATE categorias SET genero = 'femenino' WHERE LOWER(nombre) LIKE '%dama%';
UPDATE categorias SET genero = 'mixto' WHERE LOWER(nombre) LIKE '%mixto%' OR LOWER(nombre) LIKE '%suma%';

-- Migrate existing categoria_actual_id to jugador_categorias
INSERT INTO jugador_categorias (jugador_id, categoria_id)
SELECT id, categoria_actual_id FROM jugadores WHERE categoria_actual_id IS NOT NULL
ON CONFLICT (jugador_id, categoria_id) DO NOTHING;
