import { sql, type FechaTorneo } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, ArrowRight, Users } from "lucide-react"

async function getFechasTorneo(): Promise<FechaTorneo[]> {
  const result = await sql`
    SELECT * FROM fechas_torneo 
    ORDER BY fecha_calendario DESC
  `
  return result as FechaTorneo[]
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
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

export default async function CalendarioPage() {
  const fechas = await getFechasTorneo()

  const proximasFechas = fechas.filter(f => f.estado === 'programada' || f.estado === 'en_juego')
  const fechasPasadas = fechas.filter(f => f.estado === 'finalizada')

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-card via-background to-card">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-[var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
                  CALENDARIO
                </h1>
                <p className="text-muted-foreground">Todas las fechas y torneos de la liga</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          {/* Próximas Fechas */}
          <div className="mb-12">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Próximas Fechas
            </h2>
            
            {proximasFechas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No hay fechas programadas próximamente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {proximasFechas.map((fecha) => {
                  const badgeInfo = getEstadoBadge(fecha.estado)
                  return (
                    <Card key={fecha.id} className="group transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <span className="font-[var(--font-display)] text-xl leading-none">
                              {new Date(fecha.fecha_calendario).getDate()}
                            </span>
                            <span className="text-xs uppercase">
                              {new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { month: 'short' })}
                            </span>
                          </div>
                          <Badge variant="outline" className={badgeInfo.className}>
                            {badgeInfo.label}
                          </Badge>
                        </div>
                        
                        <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                          Fecha {fecha.numero_fecha} - Temporada {fecha.temporada}
                        </h3>
                        
                        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{fecha.sede}</span>
                          </div>
                          {fecha.direccion && (
                            <div className="flex items-center gap-2">
                              <span className="ml-6 text-xs">{fecha.direccion}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatShortDate(fecha.fecha_calendario)}</span>
                          </div>
                        </div>

                        <Link href={`/calendario/${fecha.id}`} className="mt-4 block">
                          <Button variant="ghost" size="sm" className="w-full gap-1 group-hover:bg-primary group-hover:text-primary-foreground">
                            Ver detalles
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Fechas Pasadas */}
          {fechasPasadas.length > 0 && (
            <div>
              <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-foreground">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Fechas Anteriores
              </h2>
              
              <div className="space-y-3">
                {fechasPasadas.map((fecha) => {
                  const badgeInfo = getEstadoBadge(fecha.estado)
                  return (
                    <Card key={fecha.id} className="transition-colors hover:border-border/80">
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <span className="font-[var(--font-display)] text-lg leading-none">
                              {new Date(fecha.fecha_calendario).getDate()}
                            </span>
                            <span className="text-xs uppercase">
                              {new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { month: 'short' })}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">Fecha {fecha.numero_fecha}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {fecha.sede}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={badgeInfo.className}>
                            {badgeInfo.label}
                          </Badge>
                          <Link href={`/calendario/${fecha.id}`}>
                            <Button variant="ghost" size="sm">
                              <Users className="mr-1 h-4 w-4" />
                              Resultados
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
