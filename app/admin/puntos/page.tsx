"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import useSWR from "swr"
import { AdminWrapper } from "@/components/admin-wrapper"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Medal, Save, Loader2, Trophy, Award } from "lucide-react"
import type { PuntosConfiguracion } from "@/lib/db"

const fetcher = (url: string) => fetch(url).then(res => res.json())

const instanciaLabels: Record<string, { label: string; icon: string; color: string }> = {
  campeon: { label: "Campeón", icon: "🏆", color: "text-yellow-500" },
  subcampeon: { label: "Subcampeón", icon: "🥈", color: "text-gray-400" },
  semifinal: { label: "Semifinalista", icon: "🥉", color: "text-amber-600" },
  "4tos": { label: "Cuartofinalista", icon: "4°", color: "text-primary" },
  "8vos": { label: "Octavos de Final", icon: "8°", color: "text-muted-foreground" },
  "16avos": { label: "16avos de Final", icon: "16°", color: "text-muted-foreground" },
  zona: { label: "Eliminado en Zona", icon: "Z", color: "text-muted-foreground" },
}

export default function PuntosConfigPage() {
  const [loading, setLoading] = useState(false)
  const [puntosLocal, setPuntosLocal] = useState<PuntosConfiguracion[]>([])
  
  const { data, mutate } = useSWR<{ puntos: PuntosConfiguracion[] }>('/api/admin/puntos', fetcher)

  useEffect(() => {
    if (data?.puntos) {
      setPuntosLocal(data.puntos)
    }
  }, [data])

  function updatePuntos(instancia: string, puntos: number) {
    const updated = puntosLocal.map(p => 
      p.instancia === instancia ? { ...p, puntos } : p
    )
    setPuntosLocal(updated)
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/puntos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puntos: puntosLocal })
      })
      if (res.ok) {
        mutate()
      }
    } catch (err) {
      console.error('Error saving puntos:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminWrapper
      title="Configuración de Puntos"
      description="Definir puntos por instancia alcanzada"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-none shadow-md bg-card/95 backdrop-blur-sm ring-1 ring-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Tabla de Puntos por Instancia
            </CardTitle>
            <CardDescription>
              Configure los puntos que se otorgan a cada jugador según la instancia alcanzada en el torneo.
              Estos puntos se asignan automáticamente al finalizar cada fecha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {puntosLocal.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-2">Cargando configuración...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {puntosLocal.sort((a, b) => a.orden - b.orden).map((p) => {
                  const info = instanciaLabels[p.instancia] || { 
                    label: p.instancia, 
                    icon: "•", 
                    color: "text-muted-foreground" 
                  }
                  return (
                    <div 
                      key={p.instancia} 
                      className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-card text-2xl ${info.color}`}>
                        {info.icon}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <Label htmlFor={`puntos-${p.instancia}`} className="text-base font-medium">
                          {info.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Instancia: {p.instancia}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`puntos-${p.instancia}`}
                          type="number"
                          min="0"
                          value={p.puntos}
                          onChange={(e) => updatePuntos(p.instancia, Number(e.target.value))}
                          className="w-24 text-center text-lg font-bold"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={loading} className="gap-2 w-full sm:w-auto">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Configuración
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-accent" />
              Información Importante
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-2">
              <li>Los puntos se asignan automáticamente cuando se finaliza un torneo</li>
              <li>Cada jugador de la pareja recibe los mismos puntos</li>
              <li>Los puntos se acumulan en el ranking general del jugador</li>
              <li>Los jugadores eliminados en fase de zonas reciben los puntos de la instancia "zona"</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminWrapper>
  )
}
