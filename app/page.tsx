import { sql, type FechaTorneo, type Jugador, type Informe } from "@/lib/db"
import { cn, parseDateOnly } from "@/lib/utils"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Trophy, Users, ArrowRight, MapPin, Clock, Activity, TrendingUp, Newspaper } from "lucide-react"

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
  const d = parseDateOnly(dateString)
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getEstadoBadge(estado: FechaTorneo['estado']) {
  const variants: Record<FechaTorneo['estado'], { label: string; className: string }> = {
    programada: { label: 'Programada', className: 'bg-blue-500/15 text-blue-600 border-blue-500/20 dark:text-blue-400' },
    en_juego: { label: 'En Curso', className: 'bg-primary/15 text-primary border-primary/25' },
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
    <div className="min-h-screen bg-background relative overflow-x-hidden font-sans">
      <Header />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black pointer-events-none" />

      <main className="relative z-10">
        {/* Curved Hero Section */}
        <section className="relative w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-12 pb-32 text-white shadow-2xl transition-all overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl text-center">
            <h1 className="font-[var(--font-display)] text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6 text-white drop-shadow-sm leading-tight">
              LIGA DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">PADEL</span>
            </h1>
            <p className="text-white/80 text-lg sm:text-xl max-w-2xl mx-auto font-medium mb-8 leading-relaxed">
              Sistema completo de gestión de torneos, rankings y resultados. Elevá tu juego al siguiente nivel.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/calendario" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 text-lg h-12 px-8 rounded-xl">
                    <Calendar className="h-5 w-5" />
                    Ver Calendario
                  </Button>
                </Link>
                <Link href="/rankings" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm text-lg h-12 px-8 rounded-xl">
                    <Trophy className="h-5 w-5" />
                    Ver Rankings
                  </Button>
                </Link>
            </div>
          </div>
        </section>

        <div className="relative z-20 -mt-20 mx-auto max-w-7xl px-4 pb-20 space-y-12">
            
            {/* Stats Grid - Floating */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
              <Card className="border-none shadow-xl bg-card/95 backdrop-blur-sm rounded-2xl ring-1 ring-border/50 text-center py-6">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
                        <Users className="h-6 w-6" />
                    </div>
                    <div className="font-[var(--font-display)] text-4xl font-bold text-foreground">
                        {stats.jugadores}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Jugadores</div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-xl bg-card/95 backdrop-blur-sm rounded-2xl ring-1 ring-border/50 text-center py-6">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <Trophy className="h-6 w-6" />
                    </div>
                    <div className="font-[var(--font-display)] text-4xl font-bold text-foreground">
                        {stats.fechas}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Torneos</div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-xl bg-card/95 backdrop-blur-sm rounded-2xl ring-1 ring-border/50 text-center py-6">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2">
                        <Activity className="h-6 w-6" />
                    </div>
                    <div className="font-[var(--font-display)] text-4xl font-bold text-foreground">
                        {stats.categorias}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Categorías</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Próximas Fechas */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                            <Calendar className="h-6 w-6 text-primary" />
                            Próximas Fechas
                        </h2>
                        <Link href="/calendario">
                             <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                                Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                             </Button>
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {proximasFechas.length === 0 ? (
                        <Card className="border-dashed border-2 bg-muted/20">
                            <CardContent className="py-12 text-center text-muted-foreground">
                            <Calendar className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            No hay fechas programadas próximamente
                            </CardContent>
                        </Card>
                        ) : (
                        proximasFechas.map((fecha) => {
                            const badgeInfo = getEstadoBadge(fecha.estado)
                            return (
                            <Card key={fecha.id} className="group overflow-hidden border-none shadow-md bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ring-1 ring-border/50 rounded-2xl">
                                <CardContent className="p-5 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className={cn(badgeInfo.className, "font-bold")}>
                                                    {badgeInfo.label}
                                                </Badge>
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                    Temporada {fecha.temporada}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                Fecha {fecha.numero_fecha}
                                            </h3>
                                            
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
                                                    <Clock className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">{formatDate(fecha.fecha_calendario)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">{fecha.sede}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Link href={`/calendario/${fecha.id}`}>
                                            <Button className="w-full sm:w-auto gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm">
                                                Ver detalles
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                            )
                        })
                        )}
                    </div>
                </div>

                {/* Top Ranking Sidebar */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                            <TrendingUp className="h-6 w-6 text-primary" />
                            Top Ranking
                        </h2>
                        <Link href="/rankings">
                             <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                                Ver completo
                             </Button>
                        </Link>
                    </div>

                    <Card className="overflow-hidden border-none shadow-xl bg-card/95 backdrop-blur-sm rounded-[2rem] ring-1 ring-border/50">
                        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-4 border-b border-border/40">
                             <CardTitle className="text-lg font-bold">Mejores Jugadores</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                        {topJugadores.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                            <Trophy className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            No hay jugadores registrados
                            </div>
                        ) : (
                            <div className="divide-y divide-border/40">
                            {topJugadores.map((jugador, index) => (
                                <div key={jugador.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black shadow-sm ${
                                    index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 ring-2 ring-yellow-500/30' :
                                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 ring-2 ring-gray-400/30' :
                                    index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900 ring-2 ring-orange-500/30' :
                                    'bg-muted text-muted-foreground font-bold'
                                }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link 
                                    href={`/jugador/${jugador.id}`}
                                    className="font-bold text-foreground hover:text-primary truncate block transition-colors text-sm sm:text-base"
                                    >
                                    {jugador.nombre} {jugador.apellido}
                                    </Link>
                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {jugador.categoria_nombre}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="font-[var(--font-display)] text-lg font-bold text-primary leading-none">
                                        {jugador.puntos_totales}
                                    </div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Pts</div>
                                </div>
                                </div>
                            ))}
                            </div>
                        )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Últimas Noticias */}
            {ultimosInformes.length > 0 && (
              <section className="pt-8">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <Newspaper className="h-6 w-6 text-primary" />
                        Últimas Noticias
                    </h2>
                    <Link href="/noticias">
                            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                            Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                    </Link>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {ultimosInformes.map((informe) => (
                    <Card key={informe.id} className="group overflow-hidden border-none shadow-md bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ring-1 ring-border/50 rounded-2xl">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                                {formatDate(informe.fecha_publicacion)}
                            </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                            {informe.titulo}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-3 text-muted-foreground mb-4 leading-relaxed">
                          {informe.contenido}
                        </p>
                        <Link href={`/noticias/${informe.id}`}>
                          <Button variant="link" className="p-0 text-primary font-bold hover:no-underline group/btn">
                            Leer más <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
