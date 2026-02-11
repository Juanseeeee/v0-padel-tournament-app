-- Seed Rankings 2026: Cargar categorías desde PDFs
-- Este script inserta las categorías si no existen

-- QUINTA MASCULINO
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'QUINTA MASCULINO', 'MASCULINO', 5
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'QUINTA MASCULINO');

-- SEXTA MASCULINO  
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'SEXTA MASCULINO', 'MASCULINO', 6
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'SEXTA MASCULINO');

-- QUINTA DAMAS
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'QUINTA DAMAS', 'FEMENINO', 5
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'QUINTA DAMAS');

-- CUARTA MASCULINO
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'CUARTA MASCULINO', 'MASCULINO', 4
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'CUARTA MASCULINO');

-- OCTAVA DAMAS
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'OCTAVA DAMAS', 'FEMENINO', 8
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'OCTAVA DAMAS');

-- SEPTIMA MASCULINO
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'SEPTIMA MASCULINO', 'MASCULINO', 7
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'SEPTIMA MASCULINO');

-- SEPTIMA DAMAS
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'SEPTIMA DAMAS', 'FEMENINO', 7
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'SEPTIMA DAMAS');

-- OCTAVA MASCULINO
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'OCTAVA MASCULINO', 'MASCULINO', 8
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'OCTAVA MASCULINO');

-- SEXTA DAMAS
INSERT INTO categorias (nombre, genero, orden_nivel)
SELECT 'SEXTA DAMAS', 'FEMENINO', 6
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'SEXTA DAMAS');
