"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Trophy, Medal, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AdminWrapper } from "@/components/admin-wrapper"
import { DetailedRankingTable, type RankingFecha, type RankingJugador } from "@/components/detailed-ranking-table"
import type { Categoria } from "@/lib/db"

export default function RankingPage() {
  const searchParams = useSearchParams()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>("")
  const [fechas, setFechas] = useState<RankingFecha[]>([])
  const [jugadores, setJugadores] = useState<RankingJugador[]>([])
  const [puntosMap, setPuntosMap] = useState<Record<number, Record<number, { puntos: number; instancia: string }>>>({})
  const [puntosArrastre, setPuntosArrastre] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [auditResult, setAuditResult] = useState<any[] | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)

  const handleAudit = async () => {
    if (!selectedCategoria) return
    setLoadingAudit(true)
    setAuditResult(null)
    try {
      const res = await fetch("/api/admin/ranking/audit", {
        method: "POST",
        body: JSON.stringify({ categoria_id: selectedCategoria }),
        headers: { "Content-Type": "application/json" }
      })
      const data = await res.json()
      setAuditResult(data.discrepancies || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAudit(false)
    }
  }

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
    const categoriaFromQuery = searchParams.get("categoria_id")
    if (categoriaFromQuery && !selectedCategoria) {
      setSelectedCategoria(categoriaFromQuery)
    }
  }, [searchParams, selectedCategoria])

  useEffect(() => {
    if (!selectedCategoria) {
      setFechas([])
      setJugadores([])
      setPuntosMap({})
      setPuntosArrastre({})
      return
    }
    setLoadingRanking(true)
    fetch(`/api/admin/ranking?categoria_id=${selectedCategoria}`)
      .then(r => r.json())
      .then(data => {
        setFechas(data.fechas || [])
        setJugadores(data.jugadores || [])
        setPuntosMap(data.puntosMap || {})
        setPuntosArrastre(data.puntosArrastre || {})
        setLoadingRanking(false)
      })
      .catch(() => setLoadingRanking(false))
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
              
              <Button 
                variant="outline" 
                onClick={handleAudit} 
                disabled={!selectedCategoria || loadingAudit}
                className="ml-auto"
              >
                {loadingAudit ? "Auditando..." : "Validar Puntos"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {auditResult && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                Discrepancias Detectadas ({auditResult.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditResult.length === 0 ? (
                <p className="text-green-600 dark:text-green-400 font-medium">Todos los puntos coinciden con los resultados esperados.</p>
              ) : (
                <div className="space-y-4">
                  {auditResult.map((d) => (
                    <div key={d.jugador_id} className="p-4 bg-white dark:bg-card rounded-lg shadow-sm border text-sm">
                      <div className="font-bold text-lg mb-1">{d.nombre}</div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>Puntos Actuales: <span className="font-mono">{d.actual}</span></div>
                        <div>Puntos Esperados: <span className="font-mono text-blue-600">{d.esperado}</span></div>
                        <div className="col-span-2 text-red-600 font-bold">Diferencia: {d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia}</div>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        <strong>Detalle Esperado:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {d.detalles.map((det: string, i: number) => (
                            <li key={i}>{det}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
          <DetailedRankingTable
            title={`Ranking - ${categorias.find(c => String(c.id) === selectedCategoria)?.nombre}`}
            jugadores={jugadores}
            fechas={fechas}
            puntosMap={puntosMap}
            puntosArrastre={puntosArrastre}
            getPlayerHref={(jugadorId) => `/jugador/${jugadorId}?from=admin-ranking&categoria_id=${selectedCategoria}`}
            cardClassName="animate-in fade-in slide-in-from-bottom-4"
          />
        )}
    </AdminWrapper>
  )
}
