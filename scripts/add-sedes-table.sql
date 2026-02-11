-- Crear tabla de sedes
CREATE TABLE IF NOT EXISTS sedes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  direccion VARCHAR(300),
  localidad VARCHAR(150),
  capacidad_canchas INTEGER DEFAULT 1,
  telefono VARCHAR(50),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar algunas sedes de ejemplo
INSERT INTO sedes (nombre, direccion, localidad, capacidad_canchas) VALUES
  ('Club Atlético Pádel', 'Av. San Martín 1234', 'Centro', 4),
  ('Pádel Sport Center', 'Calle Rivadavia 567', 'Norte', 6),
  ('La Raqueta Club', 'Belgrano 890', 'Sur', 3)
ON CONFLICT DO NOTHING;
