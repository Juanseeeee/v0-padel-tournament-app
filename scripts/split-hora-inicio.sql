ALTER TABLE fechas_torneo ADD COLUMN IF NOT EXISTS hora_inicio_viernes VARCHAR(10) DEFAULT '18:00';
ALTER TABLE fechas_torneo ADD COLUMN IF NOT EXISTS hora_inicio_sabado VARCHAR(10) DEFAULT '18:00';
UPDATE fechas_torneo SET hora_inicio_viernes = COALESCE(TO_CHAR(hora_inicio, 'HH24:MI'), '18:00'), hora_inicio_sabado = COALESCE(TO_CHAR(hora_inicio, 'HH24:MI'), '18:00');
