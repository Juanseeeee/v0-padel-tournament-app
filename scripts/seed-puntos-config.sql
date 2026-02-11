-- Seed puntos_configuracion con valores por defecto
-- instancia: donde terminó la pareja en el torneo
-- puntos: cuántos puntos recibe cada jugador de esa pareja

INSERT INTO puntos_configuracion (instancia, puntos, orden) VALUES
  ('campeon', 100, 1),
  ('finalista', 75, 2),
  ('semifinalista', 55, 3),
  ('cuartofinalista', 40, 4),
  ('octavofinalista', 30, 5),
  ('16avos', 20, 6),
  ('zona_3ro', 15, 7),
  ('zona_4to', 10, 8)
ON CONFLICT (instancia) DO UPDATE SET
  puntos = EXCLUDED.puntos,
  orden = EXCLUDED.orden;
