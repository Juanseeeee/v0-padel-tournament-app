import { sql, type Jugador, type Categoria } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

  // Ranking general
  const todosJugadores = await getAllJugadores()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-card via-background to-card">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <Trophy className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-[var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
                  RANKINGS
                </h1>
                <p className="text-muted-foreground">Clasificación de jugadores por categoría y puntos</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          {/* Ranking General - Top 10 */}
          <div className="mb-12">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-foreground">
              <Medal className="h-5 w-5 text-yellow-500" />
              Ranking General - Top 10
            </h2>
            
            {todosJugadores.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No hay jugadores registrados</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                          <th className="p-4">Pos.</th>
                          <th className="p-4">Jugador</th>
                          <th className="p-4">Categoría</th>
                          <th className="p-4 text-right">Puntos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todosJugadores.slice(0, 10).map((jugador, index) => (
                          <tr key={jugador.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${getPosicionStyle(index + 1)}`}>
                                {index + 1}
                              </div>
                            </td>
                            <td className="p-4">
                              <Link 
                                href={`/jugador/${jugador.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {jugador.nombre} {jugador.apellido}
                              </Link>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{jugador.categoria_nombre || 'Sin categoría'}</Badge>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-[var(--font-display)] text-xl text-primary">
                                {jugador.puntos_totales}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Rankings por Categoría */}
          <div>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Rankings por Categoría
            </h2>
            
            <div className="grid gap-6 lg:grid-cols-2">
              {jugadoresPorCategoria.map(({ categoria, jugadores }) => (
                <Card key={categoria.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        {categoria.nombre}
                      </span>
                      <Badge variant="secondary">{jugadores.length} jugadores</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {jugadores.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No hay jugadores en esta categoría
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {jugadores.slice(0, 5).map((jugador, index) => (
                          <li key={jugador.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${getPosicionStyle(index + 1)}`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link 
                                href={`/jugador/${jugador.id}`}
                                className="font-medium text-foreground hover:text-primary truncate block transition-colors"
                              >
                                {jugador.nombre} {jugador.apellido}
                              </Link>
                            </div>
                            <div className="font-[var(--font-display)] text-lg text-primary">
                              {jugador.puntos_totales}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {jugadores.length > 5 && (
                      <div className="border-t border-border p-3 text-center">
                        <span className="text-sm text-muted-foreground">
                          +{jugadores.length - 5} jugadores más
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
