-- Agregar categoria_id directamente a fechas_torneo
ALTER TABLE fechas_torneo ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id);
ALTER TABLE fechas_torneo ADD COLUMN IF NOT EXISTS dias_torneo INTEGER DEFAULT 3;
ALTER TABLE fechas_torneo ADD COLUMN IF NOT EXISTS formato_zona INTEGER DEFAULT 3;
ALTER TABLE fechas_torneo ADD COLUMN IF NOT EXISTS duracion_partido_min INTEGER DEFAULT 60;

-- Migrar datos existentes de config_torneo a fechas_torneo
UPDATE fechas_torneo ft
SET 
  categoria_id = ct.categoria_id,
  dias_torneo = ct.dias_torneo,
  formato_zona = ct.formato_zona,
  duracion_partido_min = ct.duracion_partido_min
FROM config_torneo ct
WHERE ft.id = ct.fecha_torneo_id;
