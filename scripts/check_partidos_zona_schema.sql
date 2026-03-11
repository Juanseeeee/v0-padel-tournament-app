
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partidos_zona';

SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'partidos_zona';
