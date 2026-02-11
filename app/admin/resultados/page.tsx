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
  Trophy, ArrowLeft, Plus, Trash2, Save, Loader2, Users, Medal
} from "lucide-react"
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Trophy className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="font-[var(--font-display)] text-xl tracking-wide text-foreground">
                CARGAR RESULTADOS
              </h1>
              <p className="text-xs text-muted-foreground">Asignar posiciones y puntos</p>
            </div>
          </div>
          <Link href="/admin/puntos">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Medal className="h-4 w-4" />
              Config. Puntos
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        {/* Selectors */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seleccionar Fecha y Categoría</CardTitle>
            <CardDescription>Elija la fecha del torneo y la categoría para cargar resultados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha del Torneo</Label>
                <Select value={selectedFecha} onValueChange={setSelectedFecha}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    {fechas.map((fecha) => (
                      <SelectItem key={fecha.id} value={String(fecha.id)}>
                        {fecha.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                  <SelectTrigger>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Participantes
                  </CardTitle>
                  <CardDescription>
                    Agregue los jugadores y sus posiciones. Los puntos se calculan automáticamente.
                  </CardDescription>
                </div>
                <Button onClick={addParticipacion} variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {participaciones.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No hay participantes. Haga clic en {"'"}Agregar{"'"} para comenzar.
                </div>
              ) : (
                <div className="space-y-4">
                  {participaciones.map((p, index) => (
                    <div key={index} className="flex items-end gap-3 rounded-lg border border-border p-4">
                      <div className="flex-1 space-y-2">
                        <Label>Jugador</Label>
                        <Select 
                          value={p.jugador_id} 
                          onValueChange={(v) => updateParticipacion(index, 'jugador_id', v)}
                        >
                          <SelectTrigger>
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
                      <div className="flex-1 space-y-2">
                        <Label>Pareja (opcional)</Label>
                        <Select 
                          value={p.pareja_id || "0"} 
                          onValueChange={(v) => updateParticipacion(index, 'pareja_id', v)}
                        >
                          <SelectTrigger>
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
                      <div className="w-24 space-y-2">
                        <Label>Posición</Label>
                        <Input
                          type="number"
                          min="1"
                          value={p.posicion}
                          onChange={(e) => updateParticipacion(index, 'posicion', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="w-20 space-y-2">
                        <Label>Puntos</Label>
                        <div className="flex h-9 items-center justify-center rounded-md bg-primary/10 font-[var(--font-display)] text-lg text-primary">
                          {p.posicion ? getPuntosForPosicion(Number(p.posicion)) : 0}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => removeParticipacion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {participaciones.length > 0 && (
                <div className="mt-6 flex justify-end gap-4">
                  <Button onClick={handleSave} disabled={loading} className="gap-2">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar Resultados
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabla de puntos */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Tabla de Puntos por Posición</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {puntosConfig.map((p) => (
                <Badge key={p.id} variant="outline" className="gap-2">
                  <span className="text-muted-foreground">#{p.posicion}</span>
                  <span className="font-bold text-primary">{p.puntos} pts</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function ResultadosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>}>
      <ResultadosContent />
    </Suspense>
  )
}
