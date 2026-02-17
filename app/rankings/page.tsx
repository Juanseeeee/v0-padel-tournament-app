import { sql, type Jugador, type Categoria } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, TrendingUp, Search } from "lucide-react"

async function getCategorias(): Promise<Categoria[]> {
  const result = await sql`SELECT * FROM categorias ORDER BY orden_nivel ASC`
  return result as Categoria[]
}

async function getJugadoresPorCategoria(categoriaId: number): Promise<Jugador[]> {
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
    WHERE j.categoria_actual_id = ${categoriaId} AND j.estado = 'activo'
    ORDER BY COALESCE(pc.total_puntos, 0) DESC
  `
  return result as Jugador[]
}

async function getAllJugadores(): Promise<Jugador[]> {
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
  `
  return result as Jugador[]
}

function getPosicionStyle(posicion: number) {
  if (posicion === 1) return 'bg-yellow-500/20 text-yellow-500 ring-2 ring-yellow-500/30'
  if (posicion === 2) return 'bg-gray-400/20 text-gray-400 ring-2 ring-gray-400/30'
  if (posicion === 3) return 'bg-orange-500/20 text-orange-500 ring-2 ring-orange-500/30'
  return 'bg-muted text-muted-foreground'
}

export default async function RankingsPage() {
  const categorias = await getCategorias()
  
  // Obtener jugadores por cada categoría
  const jugadoresPorCategoria = await Promise.all(
    categorias.map(async (cat) => ({
      categoria: cat,
      jugadores: await getJugadoresPorCategoria(cat.id)
    }))
  )

  // Ranking General
  const todosJugadores = await getAllJugadores()

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden font-sans">
      <Header />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <main className="relative z-10">
        {/* Curved Hero Section */}
        <section className="relative w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-12 pb-32 text-white shadow-2xl transition-all overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-6 ring-1 ring-white/20 shadow-lg">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-white drop-shadow-sm">
              RANKINGS
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto font-medium">
              Clasificación oficial de jugadores por categoría y puntos acumulados
            </p>
          </div>
        </section>

        <div className="relative z-20 -mt-20 mx-auto max-w-7xl px-4 pb-20 space-y-8">
          {/* Ranking General - Top 10 */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="flex items-center gap-3 px-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Medal className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Ranking General</h2>
             </div>
            
            <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-[2rem] overflow-hidden ring-1 ring-border/50">
                <CardContent className="p-0">
                    {todosJugadores.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <Trophy className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <p>No hay jugadores registrados en el ranking global</p>
                      </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {todosJugadores.slice(0, 10).map((jugador, index) => (
                                <div key={jugador.id} className="flex items-center p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                                    <div className={`
                                        w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-sm sm:text-base mr-4 sm:mr-6 shrink-0 shadow-sm
                                        ${index === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 ring-4 ring-yellow-500/20" : 
                                          index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 ring-4 ring-gray-400/20" : 
                                          index === 2 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900 ring-4 ring-orange-500/20" : 
                                          "bg-muted text-muted-foreground font-bold"}
                                    `}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                                            <h3 className="font-bold text-base sm:text-lg text-foreground truncate">
                                                {jugador.nombre} {jugador.apellido}
                                            </h3>
                                            <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase tracking-wider border-primary/20 text-primary bg-primary/5">
                                                {jugador.categoria_nombre}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                <TrendingUp className="h-3 w-3" /> {jugador.partidos_jugados || 0} Partidos
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right pl-4">
                                        <span className="block text-2xl sm:text-3xl font-black text-primary leading-none tracking-tight">
                                            {jugador.puntos_totales || 0}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Puntos</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>

          {/* Categorías */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {jugadoresPorCategoria.map(({ categoria, jugadores }) => (
              <Card key={categoria.id} className="border-none shadow-md bg-card rounded-[2rem] overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300 ring-1 ring-border/50 group">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-foreground">{categoria.nombre}</CardTitle>
                      <Badge variant="secondary" className="font-mono text-xs font-bold bg-background shadow-sm">
                        {jugadores.length} Jugadores
                      </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {jugadores.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                      Sin jugadores registrados
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {jugadores.slice(0, 5).map((jugador, index) => (
                        <div key={jugador.id} className="flex items-center p-4 hover:bg-muted/30 transition-colors">
                          <span className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 shrink-0
                            ${index < 3 ? "bg-primary/10 text-primary" : "text-muted-foreground bg-muted"}
                          `}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                                {jugador.nombre} {jugador.apellido}
                            </p>
                          </div>
                          <div className="font-bold text-sm text-foreground tabular-nums">
                            {jugador.puntos_totales || 0} <span className="text-[10px] text-muted-foreground font-normal ml-0.5">pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                {jugadores.length > 5 && (
                    <div className="p-3 bg-muted/20 border-t border-border/40 text-center">
                        <Button variant="link" className="text-xs text-muted-foreground hover:text-primary h-auto p-0 font-medium">
                            Ver {jugadores.length - 5} más
                        </Button>
                    </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
