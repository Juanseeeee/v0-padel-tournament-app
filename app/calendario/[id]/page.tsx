import { sql, type FechaTorneo, type Participacion, type Categoria } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, Trophy, Users, Clock, MapPin as MapPinIcon } from "lucide-react"
import { parseDateOnly, parseDateTime, cn } from "@/lib/utils"

// Tipos para Zonas
type ParejaZonaDetalle = {
  id: number;
  zona_id: number;
  pareja_id: number;
  posicion_final: number;
  partidos_ganados: number;
  partidos_perdidos: number;
  sets_ganados: number;
  sets_perdidos: number;
  games_ganados: number;
  games_perdidos: number;
  j1_nombre: string; j1_apellido: string;
  j2_nombre: string; j2_apellido: string;
}

type PartidoZonaDetalle = {
  id: number;
  zona_id: number;
  orden_partido: number;
  tipo_partido: string;
  estado: string;
  set1_pareja1: number | null; set1_pareja2: number | null;
  set2_pareja1: number | null; set2_pareja2: number | null;
  set3_pareja1: number | null; set3_pareja2: number | null;
  set1_tiebreak: string | null; set2_tiebreak: string | null; set3_tiebreak: string | null;
  ganador_id: number | null;
  fecha_hora_programada: string | null;
  fecha_partido?: string | null;
  dia_partido?: string | null;
  hora_estimada?: string | null;
  horario?: string | null;
  hora?: string | null;
  hora_inicio?: string | null;
  cancha_numero: number | null;
  p1_j1_nombre: string; p1_j1_apellido: string;
  p1_j2_nombre: string; p1_j2_apellido: string;
  p2_j1_nombre: string; p2_j1_apellido: string;
  p2_j2_nombre: string; p2_j2_apellido: string;
  pareja1_id: number | null;
  pareja2_id: number | null;
}

type LlaveDetalle = {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  categoria_orden: number;
  ronda: string;
  posicion: number;
  pareja1_id: number | null;
  pareja2_id: number | null;
  set1_pareja1: number | null; set1_pareja2: number | null;
  set2_pareja1: number | null; set2_pareja2: number | null;
  set3_pareja1: number | null; set3_pareja2: number | null;
  set1_tiebreak: string | null; set2_tiebreak: string | null; set3_tiebreak: string | null;
  ganador_id: number | null;
  p1_j1_nombre: string; p1_j1_apellido: string;
  p1_j2_nombre: string; p1_j2_apellido: string;
  p2_j1_nombre: string; p2_j1_apellido: string;
  p2_j2_nombre: string; p2_j2_apellido: string;
}

type ZonaConDetalles = {
  id: number;
  nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  categoria_orden: number;
  parejas: ParejaZonaDetalle[];
  partidos: PartidoZonaDetalle[];
}

async function getFechaTorneo(id: string): Promise<FechaTorneo | null> {
  const result = await sql`
    SELECT * FROM fechas_torneo WHERE id = ${id}
  `
  return result[0] as FechaTorneo | null
}

async function getLlavesDetalle(torneoId: string): Promise<LlaveDetalle[]> {
  const llaves = await sql`
    SELECT 
      l.*,
      c.nombre as categoria_nombre, c.orden_nivel as categoria_orden,
      j1a.nombre as p1_j1_nombre, j1a.apellido as p1_j1_apellido,
      j1b.nombre as p1_j2_nombre, j1b.apellido as p1_j2_apellido,
      j2a.nombre as p2_j1_nombre, j2a.apellido as p2_j1_apellido,
      j2b.nombre as p2_j2_nombre, j2b.apellido as p2_j2_apellido
    FROM llaves l
    JOIN categorias c ON l.categoria_id = c.id
    LEFT JOIN parejas_torneo pt1 ON l.pareja1_id = pt1.id
    LEFT JOIN jugadores j1a ON pt1.jugador1_id = j1a.id
    LEFT JOIN jugadores j1b ON pt1.jugador2_id = j1b.id
    LEFT JOIN parejas_torneo pt2 ON l.pareja2_id = pt2.id
    LEFT JOIN jugadores j2a ON pt2.jugador1_id = j2a.id
    LEFT JOIN jugadores j2b ON pt2.jugador2_id = j2b.id
    WHERE l.fecha_torneo_id = ${torneoId}
    ORDER BY c.orden_nivel, 
      CASE l.ronda 
        WHEN '16avos' THEN 1 
        WHEN '8vos' THEN 2 
        WHEN '4tos' THEN 3 
        WHEN 'semis' THEN 4 
        WHEN 'final' THEN 5 
      END,
      l.posicion
  `;
  return llaves as LlaveDetalle[];
}

async function getZonasDetalle(torneoId: string): Promise<ZonaConDetalles[]> {
  // 1. Obtener Zonas
  const zonas = await sql`
    SELECT z.*, c.nombre as categoria_nombre, c.orden_nivel as categoria_orden
    FROM zonas z
    JOIN categorias c ON z.categoria_id = c.id
    WHERE z.fecha_torneo_id = ${torneoId}
    ORDER BY c.orden_nivel, z.nombre
  `;

  if (zonas.length === 0) return [];

  const zonaIds = zonas.map(z => z.id);

  // 2. Obtener Parejas
  const parejas = await sql`
    SELECT 
      pz.*,
      pt.id as pareja_torneo_id,
      j1.nombre as j1_nombre, j1.apellido as j1_apellido,
      j2.nombre as j2_nombre, j2.apellido as j2_apellido
    FROM parejas_zona pz
    JOIN parejas_torneo pt ON pz.pareja_id = pt.id
    JOIN jugadores j1 ON pt.jugador1_id = j1.id
    JOIN jugadores j2 ON pt.jugador2_id = j2.id
    WHERE pz.zona_id = ANY(${zonaIds})
    ORDER BY 
      pz.zona_id, 
      pz.partidos_ganados DESC, 
      (pz.sets_ganados - pz.sets_perdidos) DESC, 
      (pz.games_ganados - pz.games_perdidos) DESC,
      pz.posicion_final ASC
  `;

  // 3. Obtener Partidos
  const partidos = await sql`
    SELECT 
      p.*,
      j1_1.nombre as p1_j1_nombre, j1_1.apellido as p1_j1_apellido,
      j1_2.nombre as p1_j2_nombre, j1_2.apellido as p1_j2_apellido,
      j2_1.nombre as p2_j1_nombre, j2_1.apellido as p2_j1_apellido,
      j2_2.nombre as p2_j2_nombre, j2_2.apellido as p2_j2_apellido
    FROM partidos_zona p
    LEFT JOIN parejas_torneo pt1 ON p.pareja1_id = pt1.id
    LEFT JOIN jugadores j1_1 ON pt1.jugador1_id = j1_1.id
    LEFT JOIN jugadores j1_2 ON pt1.jugador2_id = j1_2.id
    LEFT JOIN parejas_torneo pt2 ON p.pareja2_id = pt2.id
    LEFT JOIN jugadores j2_1 ON pt2.jugador1_id = j2_1.id
    LEFT JOIN jugadores j2_2 ON pt2.jugador2_id = j2_2.id
    WHERE p.zona_id = ANY(${zonaIds})
    ORDER BY p.zona_id, p.orden_partido
  `;

  // Agrupar datos
  return zonas.map(z => ({
    id: z.id,
    nombre: z.nombre,
    categoria_id: z.categoria_id,
    categoria_nombre: z.categoria_nombre,
    categoria_orden: z.categoria_orden,
    parejas: parejas.filter((p: any) => p.zona_id === z.id) as ParejaZonaDetalle[],
    partidos: partidos.filter((p: any) => p.zona_id === z.id) as PartidoZonaDetalle[]
  }));
}

async function getParticipaciones(fechaId: string): Promise<(Participacion & { categoria_nombre: string })[]> {
  const result = await sql`
    SELECT 
      p.*,
      j.nombre as jugador_nombre,
      j.apellido as jugador_apellido,
      c.nombre as categoria_nombre
    FROM participaciones p
    JOIN jugadores j ON p.jugador_id = j.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.fecha_torneo_id = ${fechaId}
    ORDER BY c.orden_nivel ASC NULLS LAST, p.puntos_obtenidos DESC
  `
  return result as (Participacion & { categoria_nombre: string })[]
}

async function getCategorias(): Promise<Categoria[]> {
  const result = await sql`SELECT * FROM categorias ORDER BY orden_nivel ASC`
  return result as Categoria[]
}

function formatDate(dateString: string) {
  const d = parseDateOnly(dateString)
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function getEstadoBadge(estado: FechaTorneo['estado']) {
  const variants: Record<FechaTorneo['estado'], { label: string; className: string }> = {
    programada: { label: 'Programada', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    en_juego: { label: 'En Curso', className: 'bg-primary/20 text-primary border-primary/30' },
    finalizada: { label: 'Finalizada', className: 'bg-muted text-muted-foreground border-border' },
  }
  return variants[estado] || { label: estado, className: 'bg-muted text-muted-foreground border-border' }
}

function getInstanciaLabel(instancia: string | null) {
  if (!instancia) return '-'
  const labels: Record<string, string> = {
    'zona': 'Zona',
    '16avos': '16avos',
    '8vos': '8vos',
    '4tos': 'Cuartos',
    'semis': 'Semis',
    'finalista': 'Finalista',
    'campeon': 'Campeón'
  }
  return labels[instancia] || instancia
}

function getInstanciaStyle(instancia: string | null) {
  if (!instancia) return 'bg-muted text-muted-foreground'
  if (instancia === 'campeon') return 'bg-yellow-500/20 text-yellow-500'
  if (instancia === 'finalista') return 'bg-gray-400/20 text-gray-400'
  if (instancia === 'semis') return 'bg-orange-500/20 text-orange-500'
  return 'bg-muted text-muted-foreground'
}

export default async function FechaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [fecha, participaciones, categorias, zonas, llaves] = await Promise.all([
    getFechaTorneo(id),
    getParticipaciones(id),
    getCategorias(),
    getZonasDetalle(id),
    getLlavesDetalle(id)
  ])

  if (!fecha) {
    notFound()
  }

  const badgeInfo = getEstadoBadge(fecha.estado)

  // Agrupar participaciones por categoría
  const participacionesPorCategoria = categorias.map(cat => ({
    categoria: cat,
    participaciones: participaciones.filter(p => p.categoria_id === cat.id)
  })).filter(g => g.participaciones.length > 0)

  // Agrupar zonas por categoría
  const zonasPorCategoria = categorias.map(cat => ({
    categoria: cat,
    zonas: zonas.filter(z => z.categoria_id === cat.id)
  })).filter(g => g.zonas.length > 0)

  // Agrupar llaves por categoría
  const llavesPorCategoria = categorias.map(cat => ({
    categoria: cat,
    llaves: llaves.filter(l => l.categoria_id === cat.id)
  })).filter(g => g.llaves.length > 0)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-card via-background to-card">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
            <Link href="/calendario">
              <Button variant="ghost" size="sm" className="mb-4 gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Volver al Calendario
              </Button>
            </Link>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-[var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
                    FECHA {fecha.numero_fecha} - TEMPORADA {fecha.temporada}
                  </h1>
                  <Badge variant="outline" className={badgeInfo.className}>
                    {badgeInfo.label}
                  </Badge>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {formatDate(fecha.fecha_calendario)}
                  </span>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {fecha.sede}
                  </span>
                  {fecha.direccion && (
                    <span className="text-xs">({fecha.direccion})</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="rounded-lg border border-border bg-card/50 px-4 py-3 text-center">
                  <div className="font-[var(--font-display)] text-2xl text-primary">
                    {participaciones.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Participantes</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Zonas y Partidos */}
        {zonasPorCategoria.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <h2 className="mb-6 font-[var(--font-display)] text-2xl font-bold tracking-tight">Fase de Grupos</h2>
            <div className="space-y-10">
              {zonasPorCategoria.map(({ categoria, zonas }) => (
                <div key={categoria.id} className="space-y-4">
                  <h3 className="flex items-center gap-2 text-xl font-semibold text-primary">
                    <Trophy className="h-5 w-5" />
                    {categoria.nombre}
                  </h3>
                  
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                    {zonas.map((zona) => (
                      <Card key={zona.id} className="overflow-hidden border-border/60 shadow-sm">
                        <CardHeader className="bg-muted/30 px-4 py-3">
                          <CardTitle className="text-base font-medium">{zona.nombre}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          {/* Tabla de Posiciones */}
                          <div className="overflow-x-auto border-b border-border/60">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/10">
                                <tr className="text-muted-foreground">
                                  <th className="px-3 py-2 text-left font-medium">Pareja</th>
                                  <th className="px-2 py-2 text-center font-medium">PJ</th>
                                  <th className="px-2 py-2 text-center font-medium">PG</th>
                                  <th className="px-2 py-2 text-center font-medium">PP</th>
                                  <th className="px-2 py-2 text-center font-medium">Set</th>
                                  <th className="px-2 py-2 text-center font-medium">Game</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {zona.parejas.map((pareja, idx) => (
                                  <tr key={pareja.id} className={idx < 2 ? "bg-primary/5" : ""}>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-foreground">
                                          {pareja.j1_apellido} {pareja.j1_nombre?.[0]}.
                                        </span>
                                        <span className="font-medium text-foreground">
                                          {pareja.j2_apellido} {pareja.j2_nombre?.[0]}.
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-2 text-center">{pareja.partidos_ganados + pareja.partidos_perdidos}</td>
                                    <td className="px-2 py-2 text-center font-semibold text-primary">{pareja.partidos_ganados}</td>
                                    <td className="px-2 py-2 text-center text-muted-foreground">{pareja.partidos_perdidos}</td>
                                    <td className="px-2 py-2 text-center text-muted-foreground">
                                      {pareja.sets_ganados > 0 || pareja.sets_perdidos > 0 
                                        ? `${pareja.sets_ganados}/${pareja.sets_perdidos}` 
                                        : '-'}
                                    </td>
                                    <td className="px-2 py-2 text-center text-muted-foreground">
                                      {pareja.games_ganados > 0 || pareja.games_perdidos > 0 
                                        ? `${pareja.games_ganados}/${pareja.games_perdidos}` 
                                        : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Lista de Partidos */}
                          <div className="bg-muted/5 p-3">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partidos</h4>
                            <div className="space-y-2">
                              {zona.partidos.map((partido) => {
                                const isFinalizado = partido.estado === 'finalizado';
                                const resultado = isFinalizado 
                                  ? [
                                      `${partido.set1_pareja1}-${partido.set1_pareja2}${partido.set1_tiebreak ? `(${partido.set1_tiebreak})` : ''}`,
                                      partido.set2_pareja1 !== null ? `${partido.set2_pareja1}-${partido.set2_pareja2}${partido.set2_tiebreak ? `(${partido.set2_tiebreak})` : ''}` : null,
                                      partido.set3_pareja1 !== null ? `${partido.set3_pareja1}-${partido.set3_pareja2}${partido.set3_tiebreak ? `(${partido.set3_tiebreak})` : ''}` : null
                                    ].filter(Boolean).join('  ')
                                  : 'vs';

                                const p1Label = partido.pareja1_id 
                                  ? `${partido.p1_j1_apellido}/${partido.p1_j2_apellido}`
                                  : 'A definir';
                                const p2Label = partido.pareja2_id 
                                  ? `${partido.p2_j1_apellido}/${partido.p2_j2_apellido}`
                                  : 'A definir';

                                return (
                                  <div key={partido.id} className="rounded border border-border bg-background p-2 text-xs shadow-sm">
                                    <div className="mb-1.5 flex items-center justify-between border-b border-border/50 pb-1.5">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Badge variant="outline" className="h-4 rounded-[4px] px-1 py-0 text-[10px] font-normal text-muted-foreground">
                                          P{partido.orden_partido}
                                        </Badge>
                                        {(() => {
                                          let date = parseDateTime(partido.fecha_hora_programada);

                                          // Fallback 1: Try constructing from fecha_partido (YYYY-MM-DD) + hora_estimada
                                          if (!date && partido.fecha_partido) {
                                            const dateTimeStr = partido.hora_estimada 
                                              ? `${partido.fecha_partido} ${partido.hora_estimada}`
                                              : partido.fecha_partido;
                                            date = parseDateTime(dateTimeStr);
                                          }

                                          // Fallback 2: Show dia_partido (e.g. "Viernes") + hora_estimada/horario/hora
                                          const hora = partido.hora_estimada || partido.horario || partido.hora || partido.hora_inicio;

                                          if (date) {
                                            const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
                                            const timeStr = hasTime 
                                              ? date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                                              : (hora ? `${hora}hs` : null);

                                            return (
                                              <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span className="capitalize">
                                                  {date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}
                                                </span>
                                                {timeStr && (
                                                  <>
                                                    <Clock className="h-3 w-3 ml-1" />
                                                    {timeStr}
                                                  </>
                                                )}
                                              </span>
                                            );
                                          }

                                          // Last Resort Fallback: If we have dia_partido and a time string in fecha_hora_programada or hora_estimada
                                          if (partido.dia_partido) {
                                             const timeFallback = partido.hora_estimada || (typeof partido.fecha_hora_programada === 'string' && /^\d{1,2}:\d{2}/.test(partido.fecha_hora_programada) ? partido.fecha_hora_programada : null);
                                             if (timeFallback) {
                                                 return (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        <span className="capitalize">{partido.dia_partido}</span>
                                                        <Clock className="h-3 w-3 ml-1" />
                                                        {timeFallback}hs
                                                    </span>
                                                 );
                                             }
                                             // Just day
                                             return (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span className="capitalize">{partido.dia_partido}</span>
                                                </span>
                                             );
                                          }

                                          return null;
                                        })()}
                                      </div>
                                      {partido.cancha_numero && (
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                          <MapPinIcon className="h-3 w-3" />
                                          Cancha {partido.cancha_numero}
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                      <div className={`text-right truncate ${partido.ganador_id === partido.pareja1_id ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                        {p1Label}
                                      </div>
                                      <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${isFinalizado ? 'bg-muted text-foreground' : 'bg-transparent text-muted-foreground'}`}>
                                        {resultado}
                                      </div>
                                      <div className={`text-left truncate ${partido.ganador_id === partido.pareja2_id ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                        {p2Label}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Llaves (Playoffs) */}
        {llavesPorCategoria.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 bg-muted/5">
            <h2 className="mb-6 font-[var(--font-display)] text-2xl font-bold tracking-tight">Fase Final</h2>
            <div className="space-y-12">
              {llavesPorCategoria.map(({ categoria, llaves }) => {
                const rondasPresentes = ['16avos', '8vos', '4tos', 'semis', 'final'].filter(r => 
                  llaves.some(l => l.ronda === r)
                );
                
                return (
                  <div key={categoria.id} className="space-y-6">
                    <h3 className="flex items-center gap-2 text-xl font-semibold text-primary border-b border-border/50 pb-2">
                      <Trophy className="h-5 w-5" />
                      {categoria.nombre} - Playoffs
                    </h3>
                    
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {rondasPresentes.map(ronda => {
                        const partidosRonda = llaves.filter(l => l.ronda === ronda);
                        const rondaLabel = {
                          '16avos': '16avos de Final',
                          '8vos': 'Octavos de Final',
                          '4tos': 'Cuartos de Final',
                          'semis': 'Semifinales',
                          'final': 'Final'
                        }[ronda] || ronda;

                        return (
                          <Card key={ronda} className="border-border/60 shadow-sm h-fit">
                            <CardHeader className="bg-muted/30 px-4 py-3 border-b border-border/50">
                              <CardTitle className="text-base font-medium text-center uppercase tracking-wide text-muted-foreground">
                                {rondaLabel}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-3">
                              {partidosRonda.map(partido => {
                                const isFinalizado = partido.ganador_id !== null;
                                const resultado = isFinalizado 
                                  ? [
                                      `${partido.set1_pareja1}-${partido.set1_pareja2}${partido.set1_tiebreak ? `(${partido.set1_tiebreak})` : ''}`,
                                      partido.set2_pareja1 !== null ? `${partido.set2_pareja1}-${partido.set2_pareja2}${partido.set2_tiebreak ? `(${partido.set2_tiebreak})` : ''}` : null,
                                      partido.set3_pareja1 !== null ? `${partido.set3_pareja1}-${partido.set3_pareja2}${partido.set3_tiebreak ? `(${partido.set3_tiebreak})` : ''}` : null
                                    ].filter(Boolean).join('  ')
                                  : 'vs';

                                const p1Label = partido.pareja1_id 
                                  ? `${partido.p1_j1_apellido} ${partido.p1_j1_nombre?.[0] || ''}. / ${partido.p1_j2_apellido} ${partido.p1_j2_nombre?.[0] || ''}.`
                                  : 'A definir';
                                const p2Label = partido.pareja2_id 
                                  ? `${partido.p2_j1_apellido} ${partido.p2_j1_nombre?.[0] || ''}. / ${partido.p2_j2_apellido} ${partido.p2_j2_nombre?.[0] || ''}.`
                                  : 'A definir';

                                return (
                                  <div key={partido.id} className="relative flex flex-col gap-1 rounded-lg border border-border bg-background p-3 text-sm shadow-sm">
                                    <div className="flex justify-between items-center gap-2">
                                      <span className={cn("truncate font-medium", partido.ganador_id === partido.pareja1_id && "text-primary font-bold")}>
                                        {p1Label}
                                      </span>
                                      {isFinalizado && (
                                        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                          {partido.set1_pareja1} {partido.set2_pareja1 !== null && partido.set2_pareja1} {partido.set3_pareja1 !== null && partido.set3_pareja1}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                      <span className={cn("truncate font-medium", partido.ganador_id === partido.pareja2_id && "text-primary font-bold")}>
                                        {p2Label}
                                      </span>
                                      {isFinalizado && (
                                        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                          {partido.set1_pareja2} {partido.set2_pareja2 !== null && partido.set2_pareja2} {partido.set3_pareja2 !== null && partido.set3_pareja2}
                                        </span>
                                      )}
                                    </div>
                                    {!isFinalizado && (
                                      <div className="mt-1 flex items-center justify-center text-xs text-muted-foreground bg-muted/20 py-0.5 rounded">
                                        Por jugar
                                      </div>
                                    )}
                                    {isFinalizado && (
                                      <div className="mt-1 text-center text-[10px] text-muted-foreground font-mono bg-muted/20 py-0.5 rounded">
                                        {resultado}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Resultados por Categoría (Existente) */}
        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <h2 className="mb-6 font-[var(--font-display)] text-2xl font-bold tracking-tight">Participantes y Posiciones</h2>
          {participacionesPorCategoria.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {fecha.estado === 'programada' 
                    ? 'Aún no hay participantes registrados para este torneo'
                    : 'No hay resultados disponibles para este torneo'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {participacionesPorCategoria.map(({ categoria, participaciones }) => (
                <Card key={categoria.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-accent" />
                      {categoria.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            <th className="pb-3 pr-4">Instancia</th>
                            <th className="pb-3 pr-4">Jugador</th>
                            <th className="pb-3 text-right">Puntos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participaciones.map((p) => (
                            <tr key={p.id} className="border-b border-border/50 last:border-0">
                              <td className="py-3 pr-4">
                                <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${getInstanciaStyle(p.instancia_alcanzada)}`}>
                                  {getInstanciaLabel(p.instancia_alcanzada)}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <Link 
                                  href={`/jugador/${p.jugador_id}`}
                                  className="font-medium text-foreground hover:text-primary"
                                >
                                  {p.jugador_nombre} {p.jugador_apellido}
                                </Link>
                              </td>
                              <td className="py-3 text-right">
                                <span className="font-[var(--font-display)] text-lg text-primary">
                                  {p.puntos_obtenidos}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
