-- Limpiar y reinsertar con valores correctos
DELETE FROM puntos_configuracion;

INSERT INTO puntos_configuracion (instancia, puntos, orden) VALUES
  ('campeon', 100, 1),
  ('finalista', 80, 2),
  ('semifinalista', 60, 3),
  ('cuartofinalista', 40, 4),
  ('octavofinalista', 20, 5),
  ('16avos', 15, 6),
  ('zona', 10, 7);
