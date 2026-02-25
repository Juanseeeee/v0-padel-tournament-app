import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export type Categoria = {
  id: number;
  nombre: string;
  orden_nivel: number;
  created_at: string;
};

export type Jugador = {
  id: number;
  nombre: string;
  apellido: string;
  localidad: string | null;
  genero: string;
  categoria_actual_id: number | null;
  puntos_totales: number;
  estado: "activo" | "inactivo";
  created_at: string;
  updated_at: string;
  categoria_nombre?: string;
  usuario_id?: number | null;
  usuario_email?: string | null;
  usuario_dni?: string | null;
  usuario_telefono?: string | null;
};

export type FechaTorneo = {
  id: number;
  numero_fecha: number;
  fecha_calendario: string;
  sede: string;
  direccion: string | null;
  estado: "programada" | "en_juego" | "finalizada";
  temporada: number;
  modalidad?: string;
  dias_juego?: string;
  created_at: string;
};

export type PuntosConfiguracion = {
  id: number;
  instancia: string;
  puntos: number;
  orden: number;
};

export type Participacion = {
  id: number;
  jugador_id: number;
  fecha_torneo_id: number;
  categoria_id: number | null;
  instancia_alcanzada: string | null;
  puntos_obtenidos: number;
  observaciones: string | null;
  created_at: string;
  jugador_nombre?: string;
  jugador_apellido?: string;
  categoria_nombre?: string;
};

export type HistorialPuntos = {
  id: number;
  jugador_id: number;
  categoria_id: number | null;
  fecha_torneo_id: number | null;
  puntos_acumulados: number;
  motivo: string | null;
  created_at: string;
  torneo_numero?: number;
  torneo_sede?: string;
};

export type Ascenso = {
  id: number;
  jugador_id: number;
  fecha_ascenso: string;
  categoria_origen_id: number | null;
  categoria_destino_id: number | null;
  puntos_origen: number;
  puntos_transferidos: number;
  created_at: string;
  jugador_nombre?: string;
  jugador_apellido?: string;
  categoria_origen?: string;
  categoria_destino?: string;
};

export type Informe = {
  id: number;
  titulo: string;
  contenido: string;
  fecha_publicacion: string;
  archivo_adjunto_url: string | null;
  categoria_relacionada_id: number | null;
  etiquetas: string | null;
  publicado: boolean;
  created_at: string;
};

export type Sede = {
  id: number;
  nombre: string;
  direccion: string | null;
  localidad: string | null;
  capacidad_canchas: number;
  telefono: string | null;
  activa: boolean;
  created_at: string;
};

export type ParejaTorneo = {
  id: number;
  fecha_torneo_id: number;
  jugador1_id: number;
  jugador2_id: number;
  categoria_id: number;
  numero_pareja: number;
  cabeza_serie: boolean;
  created_at: string;
  jugador1_nombre?: string;
  jugador1_apellido?: string;
  jugador2_nombre?: string;
  jugador2_apellido?: string;
  categoria_nombre?: string;
};

export type Zona = {
  id: number;
  fecha_torneo_id: number;
  categoria_id: number;
  nombre: string;
  tipo: string;
  estado: string;
  created_at: string;
  categoria_nombre?: string;
};

export type ParejaZona = {
  id: number;
  zona_id: number;
  pareja_id: number;
  posicion_final: number | null;
  partidos_ganados: number;
  partidos_perdidos: number;
  sets_ganados: number;
  sets_perdidos: number;
  games_ganados: number;
  games_perdidos: number;
  pareja_numero?: number;
  jugador1_nombre?: string;
  jugador1_apellido?: string;
  jugador2_nombre?: string;
  jugador2_apellido?: string;
};

export type PartidoZona = {
  id: number;
  zona_id: number;
  pareja1_id: number | null;
  pareja2_id: number | null;
  set1_pareja1: number | null;
  set1_pareja2: number | null;
  set2_pareja1: number | null;
  set2_pareja2: number | null;
  set3_pareja1: number | null;
  set3_pareja2: number | null;
  ganador_id: number | null;
  fecha_partido: string | null;
  hora_estimada: string | null;
  orden_partido: number;
  tipo_partido: string;
  estado: string;
  pareja1_numero?: number;
  pareja2_numero?: number;
  pareja1_jugadores?: string;
  pareja2_jugadores?: string;
};

export type Llave = {
  id: number;
  fecha_torneo_id: number;
  categoria_id: number;
  ronda: string;
  posicion: number;
  pareja1_id: number | null;
  pareja2_id: number | null;
  set1_pareja1: number | null;
  set1_pareja2: number | null;
  set2_pareja1: number | null;
  set2_pareja2: number | null;
  set3_pareja1: number | null;
  set3_pareja2: number | null;
  ganador_id: number | null;
  estado: string;
  p1_seed: string | null;
  p2_seed: string | null;
  pareja1_numero?: number;
  pareja2_numero?: number;
  pareja1_jugadores?: string;
  pareja2_jugadores?: string;
};

export type ConfigTorneo = {
  id: number;
  fecha_torneo_id: number;
  categoria_id: number;
  dias_torneo: number;
  formato_zona: number; // 3 o 4 parejas por zona
  duracion_partido_min: number;
  ronda_inicial: string | null;
  estado: string;
  created_at: string;
};
