"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trophy, Medal, MapPin, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AdminWrapper } from "@/components/admin-wrapper"
import type { Categoria } from "@/lib/db"

type Fecha = {
  id: number
  numero_fecha: number
  fecha: string
  estado: string
}

type JugadorRanking = {
  id: number
  nombre: string
  apellido: string
  localidad: string | null
  puntos_totales: number
  torneos_jugados: number
  mejor_resultado: string | null
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

export default function RankingPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>("")
  const [fechas, setFechas] = useState<Fecha[]>([])
  const [jugadores, setJugadores] = useState<JugadorRanking[]>([])
  const [puntosMap, setPuntosMap] = useState<Record<number, Record<number, { puntos: number; instancia: string }>>>({})
  const [loading, setLoading] = useState(true)
  const [loadingRanking, setLoadingRanking] = useState(false)

  useEffect(() => {
    fetch("/api/admin/categorias")
      .then(r => r.json())
      .then(data => {
        setCategorias(data.categorias || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCategoria) {
      setFechas([])
      setJugadores([])
      setPuntosMap({})
      return
    }
    setLoadingRanking(true)
    fetch(`/api/admin/ranking?categoria_id=${selectedCategoria}`)
      .then(r => r.json())
      .then(data => {
        setFechas(data.fechas || [])
        setJugadores(data.jugadores || [])
        setPuntosMap(data.puntosMap || {})
      })
      .catch(console.error)
      .finally(() => setLoadingRanking(false))
  }, [selectedCategoria])

  return (
    <AdminWrapper
        title="Ranking"
        description="Puntos acumulados por jugador y fecha"
    >
        {/* Category Selector */}
        <Card className="mb-6 border-none shadow-md bg-card/95 backdrop-blur-sm ring-1 ring-border/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="font-medium text-sm text-foreground shrink-0">Seleccionar Categoría:</label>
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-full sm:w-72 bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {!selectedCategoria ? (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Medal className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Visualizar Ranking</h3>
              <p className="text-muted-foreground max-w-md">Selecciona una categoría arriba para ver la tabla de posiciones y puntos acumulados.</p>
            </CardContent>
          </Card>
        ) : loadingRanking ? (
          <Card className="animate-pulse border-none shadow-lg bg-card/50">
            <CardContent className="h-96" />
          </Card>
        ) : jugadores.length === 0 ? (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-lg font-medium text-foreground">Sin datos</p>
              <p className="text-muted-foreground">No hay jugadores registrados en esta categoría</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-xl bg-card/95 backdrop-blur-sm ring-1 ring-border/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="pb-4 border-b border-border/10 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="h-5 w-5 text-primary" />
                    <span>Ranking - {categorias.find(c => String(c.id) === selectedCategoria)?.nombre}</span>
                </CardTitle>
                <Badge variant="secondary" className="w-fit px-3 py-1 text-sm font-medium">{jugadores.length} jugadores</Badge>
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
                    {fechas.map(f => (
                      <th key={f.id} className="px-2 py-3 text-center font-semibold min-w-[60px]">
                        <div className="flex flex-col items-center">
                          <span className="text-xs uppercase tracking-wider font-bold">F{f.numero_fecha}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jugadores.map((j, idx) => (
                    <tr
                      key={j.id}
                      className={`border-b border-border/40 transition-colors hover:bg-muted/30 group ${
                        idx < 3 ? "bg-primary/[0.02]" : ""
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-background/95 backdrop-blur px-4 py-3 font-bold text-muted-foreground border-r border-border/50 group-hover:bg-muted/30 transition-colors">
                        {idx === 0 ? <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 text-xs shadow-sm ring-1 ring-yellow-500/30">1</div> :
                         idx === 1 ? <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300/30 text-slate-500 text-xs shadow-sm ring-1 ring-slate-400/30">2</div> :
                         idx === 2 ? <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600/20 text-amber-600 text-xs shadow-sm ring-1 ring-amber-600/30">3</div> :
                         <span className="text-xs ml-1">{idx + 1}</span>}
                      </td>
                      <td className="sticky left-12 z-10 bg-background/95 backdrop-blur px-4 py-3 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] group-hover:bg-muted/30 transition-colors">
                        <Link href={`/jugador/${j.id}`} className="font-semibold text-foreground hover:text-primary transition-colors block truncate max-w-[180px]">
                          {j.nombre} {j.apellido}
                        </Link>
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
                      {fechas.map(f => {
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
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
    </AdminWrapper>
  )
}
