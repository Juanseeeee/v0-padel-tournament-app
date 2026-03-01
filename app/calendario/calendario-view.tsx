'use client'

import Link from "next/link"
import { useMemo, useState } from "react"
import type { FechaTorneo } from "@/lib/db"
import { cn, parseDateOnly } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar as MonthCalendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar as CalendarIcon, Clock, MapPin, ArrowRight, Users } from "lucide-react"

function parseLocalDate(input: string | Date) {
  return parseDateOnly(typeof input === "string" ? input : (input as Date)?.toISOString?.() || String(input ?? ""))
}

function formatLongDate(dateString: string | Date) {
  return parseLocalDate(dateString).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(dateString: string | Date) {
  return parseLocalDate(dateString).toLocaleDateString("es-AR", {
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

function DatePill({ dateString, muted }: { dateString: string | Date; muted?: boolean }) {
  const date = parseLocalDate(dateString)
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
      const d = parseLocalDate(f.fecha_calendario)
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
    <div className="relative min-h-screen">
       {/* Background Pattern */}
       <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black pointer-events-none" />

       {/* Curved Hero Section */}
       <section className="relative z-10 w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-12 pb-32 text-white shadow-2xl transition-all overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-6 ring-1 ring-white/20 shadow-lg">
              <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-white drop-shadow-sm">
              CALENDARIO
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto font-medium">
              Consultá próximas fechas y resultados anteriores
            </p>

            <div className="mt-8 flex justify-center gap-4">
               <Link href="/rankings">
                <Button variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm">
                  Ver ranking
                </Button>
              </Link>
              <Link href="/portal">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">Ir al portal</Button>
              </Link>
            </div>
          </div>
        </section>

      <div className="relative z-20 mx-auto max-w-7xl px-4 -mt-20 pb-20 space-y-8">
        
        {/* Calendar Card */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Card className="overflow-hidden border-none shadow-xl bg-card/95 backdrop-blur-sm rounded-[2rem] ring-1 ring-border/50">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Vista Mensual
                </CardTitle>
                <div className="flex items-center gap-3 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-primary/20" />
                        <span className="text-foreground/80">Programada</span>
                    </div>
                     <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
                        <span className="text-foreground/80">En juego</span>
                    </div>
                </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
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
                        "relative rounded-full bg-primary/20 text-primary ring-2 ring-primary/40 hover:bg-primary/25 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary font-bold",
                    hasEnJuego:
                        "relative rounded-full bg-blue-500/15 text-blue-600 ring-2 ring-blue-500/30 hover:bg-blue-500/20 dark:text-blue-400 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-blue-500 font-bold",
                    hasFinalizada:
                        "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-muted-foreground/70 font-medium text-muted-foreground",
                    }}
                    className="p-4 bg-background/50 rounded-xl border border-border/50 shadow-inner"
                />
                </div>
            </CardContent>
            </Card>
        </div>

        {/* Próximas Fechas */}
        <section>
          <div className="mb-4 flex items-center justify-between px-2">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Próximas Fechas
            </h3>
          </div>
          {proximasFechas.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarIcon className="mx-auto h-12 w-12 opacity-20 mb-4" />
                No hay fechas programadas próximamente
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {proximasFechas
                .slice()
                .sort((a, b) => parseLocalDate(a.fecha_calendario).getTime() - parseLocalDate(b.fecha_calendario).getTime())
                .map((fecha) => {
                  const badge = getEstadoBadge(fecha.estado)
                  return (
                    <Card key={fecha.id} className="group overflow-hidden border-none shadow-md bg-card hover:shadow-xl transition-all duration-300 ring-1 ring-border/50 rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <DatePill dateString={fecha.fecha_calendario} />
                          <Badge variant="outline" className={cn(badge.className, "font-bold tracking-wide")}>
                            {badge.label}
                          </Badge>
                        </div>

                        <div className="mt-4">
                          <div className="font-[var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                            {(fecha as any).categoria_nombre}
                          </div>
                          <div className="mt-1 text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            Fecha {fecha.numero_fecha} · Temporada {fecha.temporada}
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium">{formatShortDate(fecha.fecha_calendario)}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="truncate font-medium">{fecha.sede}</span>
                            </div>
                          </div>
                        </div>

                        <Link href={`/calendario/${fecha.id}`} className="mt-5 block">
                          <Button className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                            Ver detalles
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </section>

        {/* Fechas Pasadas */}
        <section>
          <div className="mb-4 flex items-center justify-between px-2">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Resultados Anteriores
            </h3>
          </div>
          {fechasPasadas.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 opacity-20 mb-4" />
                Todavía no hay fechas finalizadas
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {fechasPasadas
                .slice()
                .sort((a, b) => parseLocalDate(b.fecha_calendario).getTime() - parseLocalDate(a.fecha_calendario).getTime())
                .map((fecha) => {
                  const badge = getEstadoBadge(fecha.estado)
                  return (
                    <Card key={fecha.id} className="group transition-all hover:bg-muted/40 border-none shadow-sm ring-1 ring-border/50 rounded-2xl overflow-hidden">
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <DatePill dateString={fecha.fecha_calendario} muted />
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
                              Fecha {fecha.numero_fecha} · {formatShortDate(fecha.fecha_calendario)}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{fecha.sede}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn(badge.className, "hidden sm:inline-flex font-bold")}>
                            {badge.label}
                          </Badge>
                          <Link href={`/calendario/${fecha.id}`}>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors" aria-label="Ver resultados">
                              <ArrowRight className="h-5 w-5" />
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
    </div>
  )
}
