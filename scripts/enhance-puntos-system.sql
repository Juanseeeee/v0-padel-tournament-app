-- Allow a player to participate in multiple categories per fecha
ALTER TABLE participaciones DROP CONSTRAINT IF EXISTS participaciones_jugador_id_fecha_torneo_id_key;
ALTER TABLE participaciones ADD CONSTRAINT participaciones_unique_jugador_fecha_cat UNIQUE(jugador_id, fecha_torneo_id, categoria_id);

-- Create table to track accumulated points per player per category
CREATE TABLE IF NOT EXISTS puntos_categoria (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
  puntos_acumulados INTEGER DEFAULT 0,
  partidos_jugados INTEGER DEFAULT 0,
  torneos_jugados INTEGER DEFAULT 0,
  mejor_resultado VARCHAR(50),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(jugador_id, categoria_id)
);

-- Populate initial data from existing jugadores
INSERT INTO puntos_categoria (jugador_id, categoria_id, puntos_acumulados)
SELECT id, categoria_actual_id, puntos_totales
FROM jugadores
WHERE categoria_actual_id IS NOT NULL
ON CONFLICT (jugador_id, categoria_id) DO NOTHING;
