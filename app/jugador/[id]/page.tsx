import { sql, type Jugador, type HistorialPuntos, type Ascenso, type Participacion } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Trophy, Calendar, TrendingUp, ArrowUpRight, History } from "lucide-react"

async function getJugador(id: string): Promise<Jugador | null> {
  const result = await sql`
    SELECT j.*, c.nombre as categoria_nombre,
      COALESCE(pc.total_puntos, 0) as puntos_totales
    FROM jugadores j
    LEFT JOIN categorias c ON j.categoria_actual_id = c.id
    LEFT JOIN (
      SELECT jugador_id, SUM(puntos_acumulados) as total_puntos
      FROM puntos_categoria
      GROUP BY jugador_id
    ) pc ON pc.jugador_id = j.id
    WHERE j.id = ${id}
  `
  return result[0] as Jugador | null
}

async function getHistorialPuntos(jugadorId: string): Promise<HistorialPuntos[]> {
  const result = await sql`
    SELECT hp.*, ft.numero_fecha as torneo_numero, ft.sede as torneo_sede
    FROM historial_puntos hp
    LEFT JOIN fechas_torneo ft ON hp.fecha_torneo_id = ft.id
    WHERE hp.jugador_id = ${jugadorId}
    ORDER BY hp.created_at DESC
  `
  return result as HistorialPuntos[]
}

async function getParticipaciones(jugadorId: string): Promise<(Participacion & { torneo_numero: number; torneo_sede: string; fecha_calendario: string })[]> {
  const result = await sql`
    SELECT 
      p.*,
      ft.numero_fecha as torneo_numero,
      ft.sede as torneo_sede,
      ft.fecha_calendario,
      c.nombre as categoria_nombre
    FROM participaciones p
    JOIN fechas_torneo ft ON p.fecha_torneo_id = ft.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.jugador_id = ${jugadorId}
    ORDER BY ft.fecha_calendario DESC
  `
  return result as (Participacion & { torneo_numero: number; torneo_sede: string; fecha_calendario: string })[]
}

async function getAscensos(jugadorId: string): Promise<Ascenso[]> {
  const result = await sql`
    SELECT 
      a.*,
      cat_origen.nombre as categoria_origen,
      cat_destino.nombre as categoria_destino
    FROM ascensos a
    LEFT JOIN categorias cat_origen ON a.categoria_origen_id = cat_origen.id
    LEFT JOIN categorias cat_destino ON a.categoria_destino_id = cat_destino.id
    WHERE a.jugador_id = ${jugadorId}
    ORDER BY a.fecha_ascenso DESC
  `
  return result as Ascenso[]
}

async function getRankingPosicion(jugadorId: string, categoriaId: number | null): Promise<number> {
  if (!categoriaId) return 0
  const result = await sql`
    SELECT COUNT(*) + 1 as posicion
    FROM jugadores j
    LEFT JOIN (
      SELECT jugador_id, SUM(puntos_acumulados) as total_puntos
      FROM puntos_categoria
      GROUP BY jugador_id
    ) pc ON pc.jugador_id = j.id
    WHERE j.categoria_actual_id = ${categoriaId} 
      AND j.estado = 'activo'
      AND COALESCE(pc.total_puntos, 0) > (
        SELECT COALESCE(SUM(puntos_acumulados), 0) FROM puntos_categoria WHERE jugador_id = ${jugadorId}
      )
  `
  return Number(result[0]?.posicion) || 1
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
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

export default async function JugadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [jugador, historial, participaciones, ascensos] = await Promise.all([
    getJugador(id),
    getHistorialPuntos(id),
    getParticipaciones(id),
    getAscensos(id)
  ])

  if (!jugador) {
    notFound()
  }

  const rankingPosicion = await getRankingPosicion(id, jugador.categoria_actual_id)

  // Calcular estadísticas
  const totalTorneos = participaciones.length
  const victorias = participaciones.filter(p => p.instancia_alcanzada === 'campeon').length
  const podios = participaciones.filter(p => ['campeon', 'finalista', 'semis'].includes(p.instancia_alcanzada || '')).length

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-card via-background to-card">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
            <Link href="/rankings">
              <Button variant="ghost" size="sm" className="mb-4 gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Volver a Rankings
              </Button>
            </Link>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/20">
                <User className="h-12 w-12 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-[var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
                    {jugador.nombre.toUpperCase()} {jugador.apellido.toUpperCase()}
                  </h1>
                  <Badge variant="outline" className="text-sm">
                    {jugador.categoria_nombre || 'Sin categoría'}
                  </Badge>
                  {jugador.estado !== 'activo' && (
                    <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                      Inactivo
                    </Badge>
                  )}
                </div>

                {jugador.localidad && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {jugador.localidad}
                  </p>
                )}

                {/* Stats Cards */}
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
                    <div className="font-[var(--font-display)] text-2xl text-primary">
                      {jugador.puntos_totales}
                    </div>
                    <div className="text-xs text-muted-foreground">Puntos</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
                    <div className="font-[var(--font-display)] text-2xl text-accent">
                      #{rankingPosicion || '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">Ranking</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
                    <div className="font-[var(--font-display)] text-2xl text-foreground">
                      {totalTorneos}
                    </div>
                    <div className="text-xs text-muted-foreground">Torneos</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
                    <div className="font-[var(--font-display)] text-2xl text-yellow-500">
                      {victorias}
                    </div>
                    <div className="text-xs text-muted-foreground">Títulos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Historial de Participaciones */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Historial de Torneos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {participaciones.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No ha participado en ningún torneo
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {participaciones.map((p) => (
                        <div 
                          key={p.id} 
                          className="flex items-center gap-4 rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30"
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${getInstanciaStyle(p.instancia_alcanzada)}`}>
                            {getInstanciaLabel(p.instancia_alcanzada).slice(0, 3)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={`/calendario/${p.fecha_torneo_id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                              Fecha {p.torneo_numero} - {p.torneo_sede}
                            </Link>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span>{formatDate(p.fecha_calendario)}</span>
                              <span className="text-primary">{getInstanciaLabel(p.instancia_alcanzada)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-[var(--font-display)] text-lg text-primary">
                              +{p.puntos_obtenidos}
                            </div>
                            <div className="text-xs text-muted-foreground">puntos</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Historial de Puntos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Historial de Puntos
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto">
                  {historial.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin historial de puntos</p>
                  ) : (
                    <ul className="space-y-3">
                      {historial.map((h) => (
                        <li key={h.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-foreground">Fecha {h.torneo_numero}</span>
                            {h.motivo && (
                              <span className="block text-xs text-muted-foreground">
                                {h.motivo}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-primary">+{h.puntos_acumulados}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Ascensos */}
              {ascensos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowUpRight className="h-4 w-4 text-primary" />
                      Cambios de Categoría
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {ascensos.map((a) => (
                        <li key={a.id} className="rounded-lg bg-primary/5 p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">{a.categoria_origen}</Badge>
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <Badge className="text-xs">{a.categoria_destino}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDate(a.fecha_ascenso)}
                            <span className="ml-2">Puntos transferidos: {a.puntos_transferidos}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Estadísticas adicionales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Estadísticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Torneos jugados</dt>
                      <dd className="font-medium text-foreground">{totalTorneos}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Títulos</dt>
                      <dd className="font-medium text-yellow-500">{victorias}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Podios (Top 3)</dt>
                      <dd className="font-medium text-orange-500">{podios}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Promedio pts/torneo</dt>
                      <dd className="font-medium text-primary">
                        {totalTorneos > 0 
                          ? Math.round(jugador.puntos_totales / totalTorneos) 
                          : 0}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
