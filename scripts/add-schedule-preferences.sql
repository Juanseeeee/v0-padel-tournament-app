-- Add hora_inicio to fechas_torneo
ALTER TABLE fechas_torneo ADD COLUMN IF NOT EXISTS hora_inicio TIME;

-- Add preference fields to parejas_torneo
ALTER TABLE parejas_torneo ADD COLUMN IF NOT EXISTS dia_preferido VARCHAR(20) DEFAULT 'sin_preferencia';
ALTER TABLE parejas_torneo ADD COLUMN IF NOT EXISTS hora_disponible TIME;
