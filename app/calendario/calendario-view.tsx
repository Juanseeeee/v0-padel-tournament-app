'use client'

import Link from "next/link"
import { useMemo, useState } from "react"
import type { FechaTorneo } from "@/lib/db"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar as MonthCalendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar as CalendarIcon, Clock, MapPin, ArrowRight, Users } from "lucide-react"

function formatLongDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  })
}

function getEstadoBadge(estado: FechaTorneo["estado"]) {
  const variants: Record<FechaTorneo["estado"], { label: string; className: string }> = {
    programada: { label: "Programada", className: "bg-blue-500/15 text-blue-600 border-blue-500/20 dark:text-blue-400" },
    en_juego: { label: "En curso", className: "bg-primary/15 text-primary border-primary/25" },
    finalizada: { label: "Finalizada", className: "bg-muted text-muted-foreground border-border" },
  }
  return variants[estado] ?? { label: estado, className: "bg-muted text-muted-foreground border-border" }
}

function DatePill({ dateString, muted }: { dateString: string; muted?: boolean }) {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleDateString("es-AR", { month: "short" })

  return (
    <div
      className={cn(
        "flex h-14 w-14 flex-col items-center justify-center rounded-2xl ring-1 ring-border/60",
        muted ? "bg-muted/50 text-muted-foreground" : "bg-primary/10 text-primary",
      )}
    >
      <span className="text-xl font-semibold leading-none tabular-nums">{day}</span>
      <span className="text-[11px] font-medium uppercase leading-none">{month}</span>
    </div>
  )
}

export function CalendarioView({
  proximasFechas,
  fechasPasadas,
}: {
  proximasFechas: FechaTorneo[]
  fechasPasadas: FechaTorneo[]
}) {
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | undefined>(undefined)

  const calendarioMarkedDays = useMemo(() => {
    const all = [...proximasFechas, ...fechasPasadas]
    const priority: Record<string, number> = { finalizada: 1, en_juego: 2, programada: 3 }
    const perDay = new Map<string, { date: Date; estado: string }>()

    for (const f of all) {
      if (!f?.fecha_calendario) continue
      const d = new Date(f.fecha_calendario)
      d.setHours(12, 0, 0, 0)
      const key = d.toDateString()
      const estado = String((f as any).estado || "programada")
      const current = perDay.get(key)
      if (!current || (priority[estado] ?? 0) > (priority[current.estado] ?? 0)) {
        perDay.set(key, { date: d, estado })
      }
    }

    const programada: Date[] = []
    const en_juego: Date[] = []
    const finalizada: Date[] = []

    for (const { date, estado } of perDay.values()) {
      if (estado === "programada") programada.push(date)
      else if (estado === "en_juego") en_juego.push(date)
      else finalizada.push(date)
    }

    return { programada, en_juego, finalizada }
  }, [fechasPasadas, proximasFechas])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            Calendario
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Fechas y torneos</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Consultá próximas fechas y resultados anteriores.</p>
        </div>

        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <Link href="/rankings">
            <Button variant="outline" className="bg-transparent">
              Ver ranking
            </Button>
          </Link>
          <Link href="/portal">
            <Button>Ir al portal</Button>
          </Link>
        </div>
      </div>

      <section className="mt-6">
        <Card className="overflow-hidden border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Calendario</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                Programada
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mx-auto w-fit">
              <MonthCalendar
                mode="single"
                selected={selectedCalendarDay}
                onSelect={setSelectedCalendarDay}
                modifiers={{
                  hasProgramada: calendarioMarkedDays.programada,
                  hasEnJuego: calendarioMarkedDays.en_juego,
                  hasFinalizada: calendarioMarkedDays.finalizada,
                }}
                modifiersClassNames={{
                  hasProgramada:
                    "relative rounded-full bg-primary/20 text-primary ring-2 ring-primary/40 hover:bg-primary/25 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                  hasEnJuego:
                    "relative rounded-full bg-blue-500/15 text-blue-600 ring-2 ring-blue-500/30 hover:bg-blue-500/20 dark:text-blue-400 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-blue-500",
                  hasFinalizada:
                    "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-muted-foreground/70",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Próximas</h3>
        </div>
        {proximasFechas.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No hay fechas programadas.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proximasFechas
              .slice()
              .sort((a, b) => new Date(a.fecha_calendario).getTime() - new Date(b.fecha_calendario).getTime())
              .map((fecha) => {
                const badge = getEstadoBadge(fecha.estado)
                return (
                  <Card key={fecha.id} className="transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <DatePill dateString={fecha.fecha_calendario} />
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm font-semibold text-foreground">
                          Fecha {fecha.numero_fecha} · Temporada {fecha.temporada}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatShortDate(fecha.fecha_calendario)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{fecha.sede}</span>
                          </div>
                        </div>
                      </div>

                      <Link href={`/calendario/${fecha.id}`} className="mt-4 block">
                        <Button variant="secondary" className="w-full justify-between">
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
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Anteriores</h3>
        </div>
        {fechasPasadas.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Todavía no hay fechas finalizadas.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {fechasPasadas
              .slice()
              .sort((a, b) => new Date(b.fecha_calendario).getTime() - new Date(a.fecha_calendario).getTime())
              .map((fecha) => {
                const badge = getEstadoBadge(fecha.estado)
                return (
                  <Card key={fecha.id} className="transition-colors hover:border-border/80">
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <DatePill dateString={fecha.fecha_calendario} muted />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            Fecha {fecha.numero_fecha} · {formatShortDate(fecha.fecha_calendario)}
                          </div>
                          <div className="truncate text-sm text-muted-foreground">{fecha.sede}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                        <Link href={`/calendario/${fecha.id}`}>
                          <Button variant="ghost" size="icon" aria-label="Ver resultados">
                            <Users className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </section>
    </div>
  )
}
