"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Trophy, ArrowLeft, Plus, Trash2, Save, Loader2, Users, Medal, Calendar, CheckCircle2
} from "lucide-react"
import { AdminWrapper } from "@/components/admin-wrapper"
import type { FechaTorneo, Jugador, Categoria, Participacion, PuntosConfiguracion } from "@/lib/db"

const fetcher = (url: string) => fetch(url).then(res => res.json())

function ResultadosContent() {
  const searchParams = useSearchParams()
  const fechaIdParam = searchParams.get('fecha')
  
  const [selectedFecha, setSelectedFecha] = useState<string>(fechaIdParam || "")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("")
  const [loading, setSaving] = useState(false)
  const [participaciones, setParticipaciones] = useState<{
    jugador_id: string
    pareja_id: string
    posicion: string
  }[]>([])

  const { data: fechasData } = useSWR<{ fechas: FechaTorneo[] }>('/api/admin/fechas', fetcher)
  const { data: jugadoresData } = useSWR<{ jugadores: Jugador[] }>('/api/admin/jugadores', fetcher)
  const { data: categoriasData } = useSWR<{ categorias: Categoria[] }>('/api/admin/categorias', fetcher)
  const { data: puntosData } = useSWR<{ puntos: PuntosConfiguracion[] }>('/api/admin/puntos', fetcher)
  const { data: existingData, mutate: mutateExisting } = useSWR<{ participaciones: Participacion[] }>(
    selectedFecha && selectedCategoria ? `/api/admin/participaciones?fecha=${selectedFecha}&categoria=${selectedCategoria}` : null,
    fetcher
  )

  const fechas = fechasData?.fechas || []
  const jugadores = jugadoresData?.jugadores || []
  const categorias = categoriasData?.categorias || []
  const puntosConfig = puntosData?.puntos || []

  // Filter jugadores by selected categoria
  const jugadoresCategoria = jugadores.filter(j => 
    selectedCategoria ? j.categoria_id === Number(selectedCategoria) : true
  )

  // Load existing participaciones
  useEffect(() => {
    if (existingData?.participaciones) {
      setParticipaciones(existingData.participaciones.map(p => ({
        jugador_id: String(p.jugador_id),
        pareja_id: p.pareja_id ? String(p.pareja_id) : "",
        posicion: p.posicion ? String(p.posicion) : ""
      })))
    } else {
      setParticipaciones([])
    }
  }, [existingData])

  function addParticipacion() {
    setParticipaciones([...participaciones, { jugador_id: "", pareja_id: "", posicion: "" }])
  }

  function removeParticipacion(index: number) {
    setParticipaciones(participaciones.filter((_, i) => i !== index))
  }

  function updateParticipacion(index: number, field: string, value: string) {
    const updated = [...participaciones]
    updated[index] = { ...updated[index], [field]: value }
    setParticipaciones(updated)
  }

  function getPuntosForPosicion(posicion: number): number {
    const config = puntosConfig.find(p => p.posicion === posicion)
    return config?.puntos || 0
  }

  async function handleSave() {
    if (!selectedFecha || !selectedCategoria) return
    setSaving(true)

    try {
      const res = await fetch('/api/admin/participaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_torneo_id: Number(selectedFecha),
          categoria_id: Number(selectedCategoria),
          participaciones: participaciones
            .filter(p => p.jugador_id)
            .map(p => ({
              jugador_id: Number(p.jugador_id),
              pareja_id: p.pareja_id ? Number(p.pareja_id) : null,
              posicion: p.posicion ? Number(p.posicion) : null,
              puntos_obtenidos: p.posicion ? getPuntosForPosicion(Number(p.posicion)) : 0
            }))
        })
      })

      if (res.ok) {
        mutateExisting()
      }
    } catch (err) {
      console.error('Error saving participaciones:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminWrapper
        title="Cargar Resultados"
        description="Asignar posiciones y puntos a los jugadores"
        headerActions={
          <Link href="/admin/puntos">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent shadow-sm hover:bg-background/80">
              <Medal className="h-4 w-4" />
              Config. Puntos
            </Button>
          </Link>
        }
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Selectors */}
        <Card className="border-none shadow-md bg-card/95 backdrop-blur-sm ring-1 ring-border/50">
          <CardHeader className="pb-4 border-b border-border/10 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Selección de Torneo
            </CardTitle>
            <CardDescription>Elija la fecha del torneo y la categoría para cargar resultados</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha del Torneo</Label>
                <Select value={selectedFecha} onValueChange={setSelectedFecha}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Seleccionar fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    {fechas.map((fecha) => (
                      <SelectItem key={fecha.id} value={String(fecha.id)}>
                        {[
                          fecha.temporada ? `${fecha.temporada}` : "",
                          fecha.numero_fecha ? `Fecha #${fecha.numero_fecha}` : "",
                          fecha.categoria_nombre ? `${fecha.categoria_nombre}` : "",
                          fecha.sede ? `${fecha.sede}` : "",
                          fecha.fecha_calendario ? new Date(fecha.fecha_calendario).toLocaleDateString('es-AR') : ""
                        ].filter(Boolean).join(" • ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Categoría</Label>
                <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participaciones */}
        {selectedFecha && selectedCategoria && (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm ring-1 ring-border/50 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="pb-4 border-b border-border/10 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Participantes y Posiciones
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Agregue los jugadores y sus posiciones. Los puntos se calculan automáticamente.
                  </CardDescription>
                </div>
                <Button onClick={addParticipacion} variant="default" size="sm" className="gap-2 shadow-md shadow-primary/20">
                  <Plus className="h-4 w-4" />
                  Agregar Participante
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {participaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                  <Users className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-lg font-medium">No hay participantes cargados</p>
                  <p className="text-sm opacity-70 mb-4">Haga clic en "Agregar Participante" para comenzar</p>
                  <Button onClick={addParticipacion} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="sm:col-span-4">Jugador</div>
                    <div className="sm:col-span-4">Pareja (Opcional)</div>
                    <div className="sm:col-span-2">Posición</div>
                    <div className="sm:col-span-1 text-center">Puntos</div>
                    <div className="sm:col-span-1 text-right">Acciones</div>
                  </div>
                  
                  {participaciones.map((p, index) => (
                    <div key={index} className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center rounded-xl border border-border/60 bg-card/50 p-4 transition-all hover:bg-accent/5 hover:border-accent/20 hover:shadow-sm">
                      <div className="w-full sm:col-span-4 space-y-1.5 sm:space-y-0">
                        <Label className="sm:hidden text-xs text-muted-foreground">Jugador</Label>
                        <Select 
                          value={p.jugador_id} 
                          onValueChange={(v) => updateParticipacion(index, 'jugador_id', v)}
                        >
                          <SelectTrigger className="bg-background/80 border-border/60">
                            <SelectValue placeholder="Seleccionar jugador" />
                          </SelectTrigger>
                          <SelectContent>
                            {jugadoresCategoria.map((j) => (
                              <SelectItem key={j.id} value={String(j.id)}>
                                {j.nombre} {j.apellido}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-full sm:col-span-4 space-y-1.5 sm:space-y-0">
                        <Label className="sm:hidden text-xs text-muted-foreground">Pareja</Label>
                        <Select 
                          value={p.pareja_id || "0"} 
                          onValueChange={(v) => updateParticipacion(index, 'pareja_id', v)}
                        >
                          <SelectTrigger className="bg-background/80 border-border/60">
                            <SelectValue placeholder="Sin pareja" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Sin pareja</SelectItem>
                            {jugadoresCategoria
                              .filter(j => String(j.id) !== p.jugador_id)
                              .map((j) => (
                                <SelectItem key={j.id} value={String(j.id)}>
                                  {j.nombre} {j.apellido}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-full sm:col-span-2 space-y-1.5 sm:space-y-0">
                        <Label className="sm:hidden text-xs text-muted-foreground">Posición</Label>
                        <Input
                          type="number"
                          min="1"
                          value={p.posicion}
                          onChange={(e) => updateParticipacion(index, 'posicion', e.target.value)}
                          placeholder="Ej: 1"
                          className="bg-background/80 border-border/60"
                        />
                      </div>
                      
                      <div className="w-full sm:col-span-1 space-y-1.5 sm:space-y-0 flex sm:block items-center justify-between">
                        <Label className="sm:hidden text-xs text-muted-foreground">Puntos</Label>
                        <div className="flex h-10 w-full sm:w-auto items-center justify-center rounded-md bg-primary/10 font-black text-lg text-primary border border-primary/20">
                          {p.posicion ? getPuntosForPosicion(Number(p.posicion)) : 0}
                        </div>
                      </div>
                      
                      <div className="w-full sm:col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10 rounded-lg"
                          onClick={() => removeParticipacion(index)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {participaciones.length > 0 && (
                <div className="mt-8 flex justify-end pt-4 border-t border-border/10">
                  <Button onClick={handleSave} disabled={loading} size="lg" className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    Guardar Resultados
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabla de puntos */}
        <Card className="border-none shadow-md bg-card/95 backdrop-blur-sm ring-1 ring-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Referencia: Tabla de Puntos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {puntosConfig.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted border border-border/50">
                  <span className="text-muted-foreground font-medium">Pos. #{p.posicion}</span>
                  <span className="h-4 w-[1px] bg-border" />
                  <span className="font-bold text-primary">{p.puntos} pts</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminWrapper>
  )
}

export default function ResultadosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>}>
      <ResultadosContent />
    </Suspense>
  )
}
