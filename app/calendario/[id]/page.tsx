import { sql, type FechaTorneo, type Participacion, type Categoria } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, Trophy, Users } from "lucide-react"
import { parseDateOnly } from "@/lib/utils"

async function getFechaTorneo(id: string): Promise<FechaTorneo | null> {
  const result = await sql`
    SELECT * FROM fechas_torneo WHERE id = ${id}
  `
  return result[0] as FechaTorneo | null
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
  const [fecha, participaciones, categorias] = await Promise.all([
    getFechaTorneo(id),
    getParticipaciones(id),
    getCategorias()
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

        {/* Resultados por Categoría */}
        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
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
