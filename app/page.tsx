import { sql, type FechaTorneo, type Jugador, type Informe } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Trophy, Users, ArrowRight, MapPin, Clock } from "lucide-react"

async function getProximasFechas(): Promise<FechaTorneo[]> {
  try {
    const result = await sql`
      SELECT * FROM fechas_torneo 
      WHERE estado IN ('programada', 'en_juego')
      ORDER BY fecha_calendario ASC
      LIMIT 3
    `
    return result as FechaTorneo[]
  } catch (e) {
    console.error("[v0] Error fetching fechas:", e)
    return []
  }
}

async function getTopJugadores(): Promise<Jugador[]> {
  try {
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
      WHERE j.estado = 'activo'
      ORDER BY COALESCE(pc.total_puntos, 0) DESC
      LIMIT 5
    `
    return result as Jugador[]
  } catch (e) {
    console.error("[v0] Error fetching top jugadores:", e)
    return []
  }
}

async function getUltimosInformes(): Promise<Informe[]> {
  try {
    const result = await sql`
      SELECT * FROM informes
      WHERE publicado = true
      ORDER BY fecha_publicacion DESC
      LIMIT 2
    `
    return result as Informe[]
  } catch (e) {
    console.error("[v0] Error fetching informes:", e)
    return []
  }
}

async function getEstadisticas() {
  try {
    const jugadores = await sql`SELECT COUNT(*) as count FROM jugadores WHERE estado = 'activo'`
    const fechas = await sql`SELECT COUNT(*) as count FROM fechas_torneo`
    const categorias = await sql`SELECT COUNT(*) as count FROM categorias`
    
    return {
      jugadores: Number(jugadores[0]?.count) || 0,
      fechas: Number(fechas[0]?.count) || 0,
      categorias: Number(categorias[0]?.count) || 0,
    }
  } catch (e) {
    console.error("[v0] Error fetching stats:", e)
    return { jugadores: 0, fechas: 0, categorias: 0 }
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
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

export default async function HomePage() {
  const [proximasFechas, topJugadores, ultimosInformes, stats] = await Promise.all([
    getProximasFechas(),
    getTopJugadores(),
    getUltimosInformes(),
    getEstadisticas()
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-card via-background to-card">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-foreground sm:text-5xl lg:text-6xl">
                LIGA DE PADEL
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Sistema completo de gestión de torneos, rankings y resultados de tu liga de pádel
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/calendario">
                  <Button size="lg" className="gap-2">
                    <Calendar className="h-5 w-5" />
                    Ver Calendario
                  </Button>
                </Link>
                <Link href="/rankings">
                  <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                    <Trophy className="h-5 w-5" />
                    Rankings
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8">
              <div className="rounded-xl border border-border bg-card/50 p-4 text-center backdrop-blur sm:p-6">
                <div className="font-[var(--font-display)] text-3xl text-primary sm:text-4xl">
                  {stats.jugadores}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Jugadores</div>
              </div>
              <div className="rounded-xl border border-border bg-card/50 p-4 text-center backdrop-blur sm:p-6">
                <div className="font-[var(--font-display)] text-3xl text-primary sm:text-4xl">
                  {stats.fechas}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Torneos</div>
              </div>
              <div className="rounded-xl border border-border bg-card/50 p-4 text-center backdrop-blur sm:p-6">
                <div className="font-[var(--font-display)] text-3xl text-primary sm:text-4xl">
                  {stats.categorias}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Categorías</div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Sections */}
        <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Próximas Fechas */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  Próximas Fechas
                </h2>
                <Link href="/calendario" className="text-sm text-primary hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {proximasFechas.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay fechas programadas próximamente
                    </CardContent>
                  </Card>
                ) : (
                  proximasFechas.map((fecha) => {
                    const badgeInfo = getEstadoBadge(fecha.estado)
                    return (
                      <Card key={fecha.id} className="transition-colors hover:border-primary/50">
                        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-foreground">Fecha {fecha.numero_fecha}</h3>
                              <Badge variant="outline" className={badgeInfo.className}>
                                {badgeInfo.label}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatDate(fecha.fecha_calendario)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {fecha.sede}
                              </span>
                            </div>
                          </div>
                          <Link href={`/calendario/${fecha.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              Ver detalles
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>

            {/* Top Rankings */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Trophy className="h-5 w-5 text-accent" />
                  Top Ranking
                </h2>
                <Link href="/rankings" className="text-sm text-primary hover:underline">
                  Ver completo
                </Link>
              </div>
              <Card className="mt-4">
                <CardContent className="p-0">
                  {topJugadores.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No hay jugadores registrados
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {topJugadores.map((jugador, index) => (
                        <li key={jugador.id} className="flex items-center gap-4 p-4">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            index === 1 ? 'bg-gray-400/20 text-gray-400' :
                            index === 2 ? 'bg-orange-500/20 text-orange-500' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={`/jugador/${jugador.id}`}
                              className="font-medium text-foreground hover:text-primary truncate block"
                            >
                              {jugador.nombre} {jugador.apellido}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {jugador.categoria_nombre}
                            </span>
                          </div>
                          <div className="font-[var(--font-display)] text-lg text-primary">
                            {jugador.puntos_totales}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Últimas Noticias */}
        {ultimosInformes.length > 0 && (
          <section className="border-t border-border bg-card/50">
            <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  Últimas Noticias
                </h2>
                <Link href="/noticias" className="text-sm text-primary hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {ultimosInformes.map((informe) => (
                  <Card key={informe.id} className="transition-colors hover:border-primary/50">
                    <CardHeader>
                      <CardTitle className="text-lg">{informe.titulo}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(informe.fecha_publicacion)}
                      </span>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-3 text-muted-foreground">
                        {informe.contenido}
                      </p>
                      <Link href={`/noticias/${informe.id}`}>
                        <Button variant="link" className="mt-2 h-auto p-0 text-primary">
                          Leer más
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
