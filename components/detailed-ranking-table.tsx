"use client"

import Link from "next/link"
import { MapPin, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type RankingFecha = {
  id: number
  numero_fecha: number
  fecha_calendario?: string
  estado?: string
  sede?: string
}

export type RankingJugador = {
  id: number
  nombre: string
  apellido: string
  localidad: string | null
  puntos_totales: number
  torneos_jugados?: number
  mejor_resultado?: string | null
}

type RankingPointCell = {
  puntos: number
  instancia: string
}

const INSTANCIA_SHORT: Record<string, string> = {
  campeon: "C",
  finalista: "F",
  semifinalista: "SF",
  cuartofinalista: "4F",
  octavofinalista: "8F",
  "16avos": "16",
  zona: "Z",
}

const INSTANCIA_COLOR: Record<string, string> = {
  campeon: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  finalista: "bg-slate-300/30 text-slate-700 dark:text-slate-300 border-slate-300/40",
  semifinalista: "bg-amber-600/20 text-amber-700 dark:text-amber-500 border-amber-600/30",
  cuartofinalista: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  octavofinalista: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  "16avos": "bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30",
  zona: "bg-muted text-muted-foreground border-border",
}

export function DetailedRankingTable({
  title,
  jugadores,
  fechas,
  puntosMap,
  puntosArrastre,
  currentPlayerId,
  getPlayerHref,
  cardClassName,
}: {
  title: string
  jugadores: RankingJugador[]
  fechas: RankingFecha[]
  puntosMap: Record<number, Record<number, RankingPointCell>>
  puntosArrastre: Record<number, number>
  currentPlayerId?: number | null
  getPlayerHref?: (jugadorId: number) => string
  cardClassName?: string
}) {
  return (
    <Card className={cn("border-none shadow-xl bg-card/95 backdrop-blur-sm ring-1 ring-border/50 overflow-hidden", cardClassName)}>
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </CardTitle>
          <Badge variant="secondary" className="w-fit px-3 py-1 text-sm font-medium">
            {jugadores.length} jugadores
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 text-xs pt-2 border-t border-border/10">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" /> C = Campeón
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-300/20 border border-slate-300/30 text-slate-700 dark:text-slate-300 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400" /> F = Finalista
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-600/10 border border-amber-600/20 text-amber-700 dark:text-amber-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-600" /> SF = Semifinalista
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> 4F = Cuartos
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-500" /> 8F = Octavos
          </span>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground">
              <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur px-4 py-3 text-left font-semibold w-12 border-r border-border/50">#</th>
              <th className="sticky left-12 z-20 bg-muted/90 backdrop-blur px-4 py-3 text-left font-semibold min-w-[180px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Jugador</th>
              <th className="px-4 py-3 text-left font-semibold min-w-[120px]">Localidad</th>
              <th className="px-4 py-3 text-center font-bold min-w-[80px] bg-primary/5 text-primary">Total</th>
              {fechas.map((f) => (
                <th key={f.id} className="px-2 py-3 text-center font-semibold min-w-[60px]">
                  <div className="flex flex-col items-center">
                    <span className="text-xs uppercase tracking-wider font-bold">F{f.numero_fecha}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {jugadores.map((j, idx) => {
              const isCurrentPlayer = currentPlayerId === j.id
              const playerHref = getPlayerHref ? getPlayerHref(j.id) : null

              return (
                <tr
                  key={j.id}
                  className={cn(
                    "border-b border-border/40 transition-colors hover:bg-muted/30 group",
                    idx < 3 && "bg-primary/[0.02]",
                    isCurrentPlayer && "bg-primary/[0.06]"
                  )}
                >
                  <td className="sticky left-0 z-10 bg-background/95 backdrop-blur px-4 py-3 font-bold text-muted-foreground border-r border-border/50 group-hover:bg-muted/30 transition-colors">
                    {idx === 0 ? <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 text-xs shadow-sm ring-1 ring-yellow-500/30">1</div> :
                     idx === 1 ? <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300/30 text-slate-500 text-xs shadow-sm ring-1 ring-slate-400/30">2</div> :
                     idx === 2 ? <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600/20 text-amber-600 text-xs shadow-sm ring-1 ring-amber-600/30">3</div> :
                     <span className="text-xs ml-1">{idx + 1}</span>}
                  </td>

                  <td className="sticky left-12 z-10 bg-background/95 backdrop-blur px-4 py-3 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] group-hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      {playerHref ? (
                        <Link href={playerHref} className={cn("font-semibold hover:text-primary transition-colors block truncate max-w-[180px]", isCurrentPlayer ? "text-primary" : "text-foreground")}>
                          {j.nombre} {j.apellido} {isCurrentPlayer ? "(Tú)" : ""}
                        </Link>
                      ) : (
                        <span className={cn("font-semibold block truncate max-w-[180px]", isCurrentPlayer ? "text-primary" : "text-foreground")}>
                          {j.nombre} {j.apellido} {isCurrentPlayer ? "(Tú)" : ""}
                        </span>
                      )}

                      {puntosArrastre[j.id] ? (
                        <Badge variant="outline" className="w-fit mt-1 text-[10px] h-5 px-1 bg-yellow-500/10 text-yellow-600 border-yellow-200">
                          +{puntosArrastre[j.id]} Arrastre
                        </Badge>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {j.localidad ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="truncate max-w-[100px]">{j.localidad}</span>
                      </div>
                    ) : <span className="text-muted-foreground/30 text-xs">-</span>}
                  </td>

                  <td className="px-4 py-3 text-center font-black text-base text-primary bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    {j.puntos_totales}
                  </td>

                  {fechas.map((f) => {
                    const data = puntosMap[j.id]?.[f.id]
                    if (!data) {
                      return <td key={f.id} className="px-2 py-3 text-center text-muted-foreground/20 text-xs">-</td>
                    }

                    const short = INSTANCIA_SHORT[data.instancia] || "?"
                    const colorClass = INSTANCIA_COLOR[data.instancia] || "bg-muted text-muted-foreground border-border"

                    return (
                      <td key={f.id} className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-sm text-foreground">{data.puntos}</span>
                          <span className={`rounded-sm px-1 py-[1px] text-[9px] font-bold border ${colorClass} bg-opacity-30`}>
                            {short}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
