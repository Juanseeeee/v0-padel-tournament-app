
ALTER TABLE llaves 
ADD COLUMN IF NOT EXISTS siguiente_llave_id INTEGER REFERENCES llaves(id),
ADD COLUMN IF NOT EXISTS siguiente_llave_slot INTEGER; -- 1 para pareja1, 2 para pareja2
