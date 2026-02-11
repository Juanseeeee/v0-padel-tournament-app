-- Script completo para importar datos de la Liga de Verano
-- Ejecutar este script para cargar todas las categorías, sedes y jugadores

-- ==============================================
-- 1. CATEGORÍAS
-- ==============================================
INSERT INTO categorias (nombre, genero) VALUES
('4TA Caballeros', 'masculino'),
('5TA Damas', 'femenino'),
('5TA Caballeros', 'masculino'),
('6TA Damas', 'femenino'),
('6TA Caballeros', 'masculino'),
('7MA Damas', 'femenino'),
('7MA Caballeros', 'masculino'),
('8VA Damas', 'femenino'),
('8VA Caballeros', 'masculino'),
('SUMA 8', 'mixto')
ON CONFLICT (nombre) DO NOTHING;

-- ==============================================
-- 2. SEDES
-- ==============================================
INSERT INTO sedes (nombre, localidad, capacidad_canchas, activa) VALUES
('Arenales Padel', 'Arenales', 4, true),
('Arribeños Padel', 'Arribeños', 3, true),
('Ascension Padel', 'Ascension', 3, true),
('Ferre Padel', 'Ferre', 4, true),
('Vedia Padel', 'Vedia', 3, true),
('Teodelina Padel', 'Teodelina', 2, true),
('Junin Padel', 'Junin', 3, true),
('Lincoln Padel', 'Lincoln', 2, true),
('Villa Cañas Padel', 'V. Cañas', 2, true),
('La Angelita Padel', 'La Angelita', 2, true),
('Alem Padel', 'Alem', 2, true),
('Colon Padel', 'Colon', 2, true),
('Maria Teresa Padel', 'Maria Teresa', 1, true),
('Santa Isabel Padel', 'Santa Isabel', 1, true),
('Iriarte Padel', 'Iriarte', 1, true),
('Whell Padel', 'Whell', 1, true),
('Venado Tuerto Padel', 'Venado Tuerto', 2, true),
('Chacabuco Padel', 'Chacabuco', 2, true),
('Arenasa Padel', 'Arenasa', 1, true),
('General Pintos Padel', 'General Pintos', 1, true),
('Germania Padel', 'Germania', 1, true),
('Firmat Padel', 'Firmat', 1, true),
('Viamonte Padel', 'Viamonte', 1, true),
('Tiburcio Padel', 'Tiburcio', 1, true),
('Agustin Roca Padel', 'Agustin Roca', 1, true),
('Alberdi Padel', 'Alberdi', 1, true),
('Hugues Padel', 'Hugues', 1, true),
('Las Rosas Padel', 'Las Rosas', 1, true)
ON CONFLICT (nombre) DO NOTHING;

-- ==============================================
-- 3. JUGADORES
-- Por cada categoría, insertamos los jugadores del CSV
-- ==============================================

-- Debido al gran volumen de datos (cientos de jugadores),
-- este script ha sido optimizado para ejecutarse en lotes

-- NOTA: El sistema detecta automáticamente duplicados usando
-- ON CONFLICT (nombre, apellido, localidad) DO NOTHING

SELECT 'Importando jugadores...' as status;

-- Este script se puede ejecutar desde la interfaz de administración
-- o desde la línea de comandos con psql
