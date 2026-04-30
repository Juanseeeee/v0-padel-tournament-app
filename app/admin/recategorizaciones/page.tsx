"use client"

import React, { useState, useEffect } from "react"
import { AdminWrapper } from "@/components/admin-wrapper"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUp, ArrowDown, TrendingUp, Loader2, Calendar, ArrowRight } from "lucide-react"
import { PlayerCombobox } from "@/components/player-combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function RecategorizacionesAdminPage() {
  const [jugadorId, setJugadorId] = useState<string>("")
  const [jugador, setJugador] = useState<any>(null)
  const [categorias, setCategorias] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  
  const [catAnteriorId, setCatAnteriorId] = useState<string>("")
  const [catNuevaId, setCatNuevaId] = useState<string>("")
  const [tipo, setTipo] = useState<"ascenso" | "descenso">("ascenso")
  const [saving, setSaving] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const fetchHistorial = () => {
    setLoadingHistorial(true)
    fetch("/api/portal/ascensos")
      .then(res => res.json())
      .then(data => {
        setHistorial(data.ascensos || [])
      })
      .finally(() => setLoadingHistorial(false))
  }

  useEffect(() => {
    fetch("/api/admin/categorias")
      .then(res => res.json())
      .then(data => setCategorias(data.categorias || []))
      
    fetchHistorial()
  }, [])

  useEffect(() => {
    if (!jugadorId) {
      setJugador(null)
      setCatAnteriorId("")
      return
    }
    
    fetch(`/api/admin/jugadores/${jugadorId}`)
      .then(res => res.json())
      .then(data => {
        setJugador(data.jugador)
        // Auto-select their current active category if possible
        if (data.jugador?.categoria_actual_id) {
          setCatAnteriorId(String(data.jugador.categoria_actual_id))
        } else if (data.jugador?.categoria_ids && data.jugador.categoria_ids.length > 0) {
          setCatAnteriorId(String(data.jugador.categoria_ids[0]))
        } else {
          setCatAnteriorId("none")
        }
      })
  }, [jugadorId])

  async function handleRecategorizar(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMsg("")
    setErrorMsg("")
    
    if (!jugadorId || !catNuevaId) {
      setErrorMsg("Debes seleccionar un jugador y una nueva categoría")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/jugadores/recategorizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jugador_id: parseInt(jugadorId),
          categoria_anterior_id: catAnteriorId === "none" ? null : parseInt(catAnteriorId),
          categoria_nueva_id: parseInt(catNuevaId),
          tipo,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al recategorizar")
      
      setSuccessMsg(data.message)
      setJugadorId("") // Reset
      setCatAnteriorId("")
      setCatNuevaId("")
      fetchHistorial() // Refresh the history table
    } catch (error: any) {
      setErrorMsg(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminWrapper 
      title="Recategorizaciones" 
      description="Gestiona ascensos y descensos de forma ágil"
    >
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="border-none shadow-xl bg-card/95 backdrop-blur-sm rounded-3xl ring-1 ring-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-[var(--font-display)]">Nueva Recategorización</CardTitle>
            <CardDescription>Busca un jugador y aplica su nueva categoría. Los puntos se transferirán automáticamente si corresponde.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecategorizar} className="space-y-6">
              
              {successMsg && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 font-medium text-sm text-center">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-medium text-sm text-center">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <div className="grid gap-2">
                  <Label className="text-base font-semibold">Seleccionar Jugador</Label>
                  <PlayerCombobox 
                    value={jugadorId}
                    onChange={(val) => {
                      setJugadorId(val)
                      setSuccessMsg("")
                      setErrorMsg("")
                    }}
                  />
                </div>

                {jugador && (
                  <div className="grid gap-2 mt-4 animate-in fade-in slide-in-from-top-4">
                    <Label>Categoría Anterior (a remover)</Label>
                    <Select value={catAnteriorId} onValueChange={setCatAnteriorId}>
                      <SelectTrigger className="rounded-xl h-12 bg-background">
                        <SelectValue placeholder="Ninguna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguna</SelectItem>
                        {jugador?.categoria_ids?.map((id: number) => {
                          const cat = categorias.find(c => c.id === id)
                          return cat ? <SelectItem key={id} value={String(id)}>{cat.nombre}</SelectItem> : null
                        })}
                        {/* Fallback */}
                        {(!jugador?.categoria_ids && jugador?.categoria_actual_id) && (() => {
                          const cat = categorias.find(c => c.id === jugador.categoria_actual_id)
                          return cat ? <SelectItem value={String(cat.id)}>{cat.nombre}</SelectItem> : null
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label className="text-base font-semibold">Tipo de Movimiento</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    type="button" 
                    variant={tipo === 'ascenso' ? 'default' : 'outline'}
                    onClick={() => setTipo('ascenso')}
                    className="h-12 rounded-xl text-base shadow-sm"
                  >
                    <ArrowUp className="mr-2 h-5 w-5" /> Ascenso
                  </Button>
                  <Button 
                    type="button" 
                    variant={tipo === 'descenso' ? 'default' : 'outline'}
                    onClick={() => setTipo('descenso')}
                    className="h-12 rounded-xl text-base shadow-sm"
                  >
                    <ArrowDown className="mr-2 h-5 w-5" /> Descenso
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-base font-semibold">Nueva Categoría</Label>
                <Select value={catNuevaId} onValueChange={setCatNuevaId}>
                  <SelectTrigger className="rounded-xl h-12 border-primary/20 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Selecciona la nueva categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                disabled={saving || !jugadorId || !catNuevaId} 
                className="w-full h-14 rounded-xl text-lg shadow-lg shadow-primary/20 mt-4"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Aplicar Recategorización"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/95 backdrop-blur-sm rounded-3xl ring-1 ring-border/50 mt-8 mb-12">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Últimas Recategorizaciones
            </CardTitle>
            <CardDescription>
              Historial de movimientos de categoría de los jugadores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistorial ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay recategorizaciones registradas
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-hidden bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[100px]">Fecha</TableHead>
                      <TableHead>Jugador</TableHead>
                      <TableHead>Movimiento</TableHead>
                      <TableHead className="text-right">Arrastre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium whitespace-nowrap text-muted-foreground">
                          {new Date(item.fecha_ascenso).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-bold">
                          {item.jugador_nombre} {item.jugador_apellido}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background text-xs font-normal">
                              {item.categoria_origen || "Ninguna"}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold border-transparent">
                              {item.categoria_destino}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.puntos_transferidos > 0 ? (
                            <span className="text-green-600 bg-green-500/10 px-2 py-1 rounded-md text-xs font-bold">
                              +{item.puntos_transferidos} pts
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminWrapper>
  )
}
