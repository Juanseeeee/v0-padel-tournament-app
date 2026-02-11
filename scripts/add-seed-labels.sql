-- Add seed label columns to llaves for showing zone classification (e.g., "1A", "3B")
ALTER TABLE llaves ADD COLUMN IF NOT EXISTS p1_seed VARCHAR(10);
ALTER TABLE llaves ADD COLUMN IF NOT EXISTS p2_seed VARCHAR(10);
