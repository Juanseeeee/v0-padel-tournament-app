"use client"
import { useState } from "react"
import { AdminWrapper } from "@/components/admin-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Link as LinkIcon, Loader2 } from "lucide-react"

export default function LinkUsuarioJugadorPage() {
  const [email, setEmail] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [loading, setLoading] = useState(false)
  const [usuario, setUsuario] = useState<any>(null)
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function buscar() {
    setLoading(true)
    setError("")
    setMessage("")
    setSelectedId(null)
    try {
      const url = `/api/admin/usuarios/find?email=${encodeURIComponent(email)}${localidad ? `&localidad=${encodeURIComponent(localidad)}` : ""}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error buscando usuario")
        setUsuario(null)
        setCandidatos([])
      } else {
        setUsuario(data.usuario)
        setCandidatos(Array.isArray(data.candidatos) ? data.candidatos : [])
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  async function vincular() {
    if (!usuario || !selectedId) return
    setLoading(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/admin/usuarios/link-jugador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: usuario.email, jugador_id: selectedId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al vincular")
      } else {
        setMessage("Vinculación realizada correctamente")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminWrapper
      title="Vincular Usuario con Jugador"
      description="Herramienta para vincular cuentas registradas con jugadores existentes creados por administradores"
      headerActions={null}
    >
      <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Buscar Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                placeholder="Email del usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <Input
                placeholder="Localidad para filtrar jugador (opcional)"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex">
              <Button onClick={buscar} className="rounded-xl w-full sm:w-auto px-4 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          {message && (
            <div className="text-sm text-green-600">{message}</div>
          )}

          {usuario && (
            <div className="rounded-xl border border-border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{usuario.nombre} {usuario.apellido}</div>
                  <div className="text-sm text-muted-foreground">{usuario.email}</div>
                </div>
                <Badge variant="secondary" className="rounded-lg">
                  Usuario ID: {usuario.id}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {usuario && (
        <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-2xl mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Candidatos de Jugador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidatos.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin candidatos</div>
            ) : (
              <div className="space-y-2">
                {candidatos.map((c) => (
                  <label key={c.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="jugador"
                        checked={selectedId === c.id}
                        onChange={() => setSelectedId(c.id)}
                        className="accent-primary"
                      />
                      <div>
                        <div className="font-semibold">{c.nombre} {c.apellido}</div>
                        <div className="text-sm text-muted-foreground">{c.localidad || "Sin localidad"}</div>
                        <div className="mt-1 text-xs">
                          <span className="font-medium">Puntos Totales:</span> {c.puntos_totales ?? 0}
                        </div>
                        {Array.isArray(c.puntos_por_categoria) && c.puntos_por_categoria.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {c.puntos_por_categoria
                              .filter((pc: any) => pc.puntos > 0)
                              .map((pc: any) => (
                                <Badge key={`${c.id}-${pc.categoria_id}`} variant="outline" className="rounded-lg text-[11px]">
                                  {pc.nombre}: {pc.puntos} pts
                                </Badge>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-lg">{c.estado}</Badge>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={vincular}
                disabled={!selectedId || loading}
                className="rounded-xl gap-2"
              >
                <LinkIcon className="h-4 w-4" />
                Vincular
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminWrapper>
  )
}
