 "use client"
 
 import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy } from "lucide-react"

type Categoria = { id: number; nombre: string }
type JugadorRanking = {
  id: number
  nombre: string
  apellido: string
  localidad: string | null
  puntos_totales: number
  torneos_jugados?: number
}
type FechaTorneo = {
  id: number
  numero_fecha: number
  fecha_calendario: string
  sede: string
  estado: string
}

export default function RankingsPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>("")
  const [jugadores, setJugadores] = useState<JugadorRanking[]>([])
  const [fechas, setFechas] = useState<FechaTorneo[]>([])
  const [puntosMap, setPuntosMap] = useState<Record<number, Record<number, { puntos: number; instancia: string }>>>({})
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [loadingRanking, setLoadingRanking] = useState(false)

  useEffect(() => {
    fetch("/api/public/categorias")
      .then(r => r.json())
      .then((data: Categoria[]) => setCategorias(data || []))
      .finally(() => setLoadingCategorias(false))
  }, [])

  useEffect(() => {
    if (!selectedCategoria) {
      setJugadores([])
      setFechas([])
      setPuntosMap({})
      return
    }
    setLoadingRanking(true)
    fetch(`/api/portal/ranking?categoria_id=${selectedCategoria}`)
      .then(r => r.json())
      .then((data) => {
        setJugadores(data?.jugadores || [])
        setFechas(data?.fechas || [])
        setPuntosMap(data?.puntosMap || {})
      })
      .catch(() => {
        setJugadores([])
        setFechas([])
        setPuntosMap({})
      })
      .finally(() => setLoadingRanking(false))
  }, [selectedCategoria])

  const hasSelection = selectedCategoria !== ""

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden font-sans">
      <Header />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <main className="relative z-10">
        <section className="relative w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-12 pb-32 text-white shadow-2xl transition-all overflow-hidden">
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
              Elegí una categoría para ver su ranking detallado
            </p>
          </div>
        </section>

        <div className="relative z-20 -mt-20 mx-auto max-w-7xl px-4 pb-20 space-y-8">
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-[2rem] ring-1 ring-border/50">
            <CardHeader className="pb-4 border-b border-border/10 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-xl">Tabla de Posiciones</CardTitle>
                <div className="min-w-[240px]">
                  <Select value={selectedCategoria} onValueChange={setSelectedCategoria} disabled={loadingCategorias}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={loadingCategorias ? "Cargando categorías..." : "Elegí una categoría"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {!hasSelection ? (
                <div className="p-12 text-center text-muted-foreground">
                  Seleccioná una categoría para ver la tabla de posiciones.
                </div>
              ) : loadingRanking ? (
                <div className="p-8 space-y-4">
                  <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                  <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                  <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                  <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                </div>
              ) : jugadores.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No hay jugadores con puntos en esta categoría
                </div>
              ) : (
                <TooltipProvider delayDuration={0}>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/40">
                        <TableHead className="w-12 text-center font-bold text-muted-foreground">#</TableHead>
                        <TableHead className="min-w-[200px] font-bold text-muted-foreground">Jugador</TableHead>
                        {fechas.map((fecha) => (
                          <TableHead key={fecha.id} className="text-center min-w-[80px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help flex flex-col items-center">
                                  <span className="font-bold text-primary">Fecha {fecha.numero_fecha}</span>
                                  <span className="text-[10px] font-normal text-muted-foreground hidden sm:block">
                                    {new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-center p-2">
                                <p className="font-bold">Fecha {fecha.numero_fecha}</p>
                                <p className="text-xs">{new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                <p className="text-xs text-muted-foreground mt-1">{fecha.sede}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-bold text-primary w-24">TOTAL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jugadores.map((j, idx) => (
                        <TableRow key={j.id} className="hover:bg-muted/30 border-b border-border/40 transition-colors">
                          <TableCell className="text-center font-medium">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mx-auto
                              ${idx === 0 ? "bg-yellow-100 text-yellow-700" : 
                                idx === 1 ? "bg-gray-100 text-gray-700" : 
                                idx === 2 ? "bg-orange-100 text-orange-700" : 
                                "text-muted-foreground"}
                            `}>
                              {idx + 1}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{j.nombre} {j.apellido}</span>
                              {j.localidad && (
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{j.localidad}</span>
                              )}
                            </div>
                          </TableCell>
                          {fechas.map((fecha) => {
                            const puntosData = puntosMap[j.id]?.[fecha.id];
                            return (
                              <TableCell key={fecha.id} className="text-center p-2">
                                {puntosData ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="inline-flex flex-col items-center cursor-help">
                                        <span className="font-bold text-foreground">{puntosData.puntos}</span>
                                        {puntosData.instancia && (
                                          <span className="text-[9px] text-muted-foreground uppercase max-w-[60px] truncate">
                                            {puntosData.instancia === 'campeon' ? '🏆' : 
                                             puntosData.instancia === 'finalista' ? '🥈' : 
                                             puntosData.instancia.substring(0, 3)}
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-bold">{puntosData.puntos} Puntos</p>
                                      <p className="text-xs capitalize">{puntosData.instancia?.replace('_', ' ') || 'Participación'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-muted-foreground/30 text-xl">-</span>
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-right">
                            <span className="font-black text-lg text-primary">{j.puntos_totales}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
