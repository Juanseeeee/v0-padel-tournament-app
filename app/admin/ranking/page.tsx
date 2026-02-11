"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Trophy, Medal, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
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
  campeon: "bg-yellow-500/20 text-yellow-700",
  finalista: "bg-slate-300/30 text-slate-700",
  semifinalista: "bg-amber-600/20 text-amber-700",
  cuartofinalista: "bg-blue-500/20 text-blue-700",
  octavofinalista: "bg-cyan-500/20 text-cyan-700",
  "16avos": "bg-teal-500/20 text-teal-700",
  zona: "bg-muted text-muted-foreground",
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
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
                Ranking
              </h1>
              <p className="text-muted-foreground">Puntos acumulados por jugador y fecha</p>
            </div>
          </div>
        </div>

        {/* Category Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="font-medium text-sm text-foreground shrink-0">Categoria:</label>
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Seleccionar categoria" />
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Medal className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Selecciona una categoria para ver el ranking</p>
            </CardContent>
          </Card>
        ) : loadingRanking ? (
          <Card className="animate-pulse">
            <CardContent className="h-64" />
          </Card>
        ) : jugadores.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Trophy className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No hay jugadores en esta categoria</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Ranking - {categorias.find(c => String(c.id) === selectedCategoria)?.nombre}</span>
                <Badge variant="secondary">{jugadores.length} jugadores</Badge>
              </CardTitle>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-500/20" /> C = Campeon</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-slate-300/30" /> F = Finalista</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-600/20" /> SF = Semifinalista</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500/20" /> 4F = Cuartos</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-cyan-500/20" /> 8F = Octavos</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-teal-500/20" /> 16 = 16avos</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-muted" /> Z = Zona</span>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/90 backdrop-blur px-3 py-3 text-left font-semibold w-10">#</th>
                    <th className="sticky left-10 z-10 bg-muted/90 backdrop-blur px-3 py-3 text-left font-semibold min-w-[180px]">Jugador</th>
                    <th className="px-3 py-3 text-left font-semibold min-w-[100px]">Localidad</th>
                    <th className="px-3 py-3 text-center font-semibold min-w-[70px] bg-primary/10">Total</th>
                    {fechas.map(f => (
                      <th key={f.id} className="px-2 py-3 text-center font-semibold min-w-[55px]">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground">F{f.numero_fecha}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jugadores.map((j, idx) => (
                    <tr
                      key={j.id}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                        idx < 3 ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-background px-3 py-2.5 font-bold text-muted-foreground">
                        {idx === 0 ? <span className="text-yellow-500">1</span> :
                         idx === 1 ? <span className="text-slate-400">2</span> :
                         idx === 2 ? <span className="text-amber-600">3</span> :
                         idx + 1}
                      </td>
                      <td className="sticky left-10 z-10 bg-background px-3 py-2.5">
                        <Link href={`/jugador/${j.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {j.nombre} {j.apellido}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {j.localidad && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[100px]">{j.localidad}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-lg text-primary bg-primary/5">
                        {j.puntos_totales}
                      </td>
                      {fechas.map(f => {
                        const data = puntosMap[j.id]?.[f.id]
                        if (!data) {
                          return <td key={f.id} className="px-2 py-2.5 text-center text-muted-foreground/40">-</td>
                        }
                        const short = INSTANCIA_SHORT[data.instancia] || "?"
                        const color = INSTANCIA_COLOR[data.instancia] || "bg-muted text-muted-foreground"
                        return (
                          <td key={f.id} className="px-2 py-2.5 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-semibold text-foreground">{data.puntos}</span>
                              <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${color}`}>{short}</span>
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
      </div>
    </main>
  )
}
