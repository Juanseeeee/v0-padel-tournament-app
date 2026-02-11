"use client"

import React from "react"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { Calendar as MonthCalendar } from "@/components/ui/calendar"
import { ArrowLeft, Plus, Edit2, Trash2, Calendar as CalendarIcon, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FechaTorneo, Sede, Categoria } from "@/lib/db"

type FechaExtendida = FechaTorneo & {
  categoria_id: number | null
  categoria_nombre: string | null
  dias_torneo: number
  formato_zona: number
  duracion_partido_min: number
  hora_inicio_viernes: string | null
  hora_inicio_sabado: string | null
}

function getEstadoBadge(estado: FechaTorneo['estado']) {
  const variants: Record<FechaTorneo['estado'], { label: string; className: string }> = {
    programada: { label: 'Programada', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    en_juego: { label: 'En Curso', className: 'bg-primary/20 text-primary border-primary/30' },
    finalizada: { label: 'Finalizada', className: 'bg-muted text-muted-foreground border-border' },
  }
  return variants[estado] || { label: estado, className: 'bg-muted text-muted-foreground border-border' }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function FechasAdminPage() {
  const [fechas, setFechas] = useState<FechaExtendida[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingFecha, setEditingFecha] = useState<FechaExtendida | null>(null)
  const [deletingFecha, setDeletingFecha] = useState<FechaExtendida | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state - todo en un solo objeto
  const [formData, setFormData] = useState({
    numero_fecha: 1,
    fecha_calendario: "",
    sede_id: "",
    direccion: "",
    estado: "programada" as FechaTorneo['estado'],
    temporada: new Date().getFullYear(),
    categoria_id: "",
    dias_torneo: 3,
    formato_zona: 3,
    duracion_partido_min: 60,
    hora_inicio_viernes: "18:00",
    hora_inicio_sabado: "18:00",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const calendarioMarkedDays = useMemo(() => {
    const priority: Record<string, number> = { finalizada: 1, en_juego: 2, programada: 3 }
    const perDay = new Map<string, { date: Date; estado: string }>()

    for (const f of fechas) {
      if (!f?.fecha_calendario) continue
      const d = new Date(f.fecha_calendario)
      d.setHours(12, 0, 0, 0)
      const key = d.toDateString()
      const estado = String(f.estado || "programada")
      const current = perDay.get(key)
      if (!current || (priority[estado] ?? 0) > (priority[current.estado] ?? 0)) {
        perDay.set(key, { date: d, estado })
      }
    }

    const programada: Date[] = []
    const en_juego: Date[] = []
    const finalizada: Date[] = []

    for (const { date, estado } of perDay.values()) {
      if (estado === "programada") programada.push(date)
      else if (estado === "en_juego") en_juego.push(date)
      else finalizada.push(date)
    }

    return { programada, en_juego, finalizada }
  }, [fechas])

  const proximasFechas = useMemo(() => {
    return fechas
      .filter((f) => f.estado !== "finalizada")
      .slice()
      .sort((a, b) => new Date(a.fecha_calendario).getTime() - new Date(b.fecha_calendario).getTime())
  }, [fechas])

  const fechasAnteriores = useMemo(() => {
    return fechas
      .filter((f) => f.estado === "finalizada")
      .slice()
      .sort((a, b) => new Date(b.fecha_calendario).getTime() - new Date(a.fecha_calendario).getTime())
  }, [fechas])

  async function fetchData() {
    try {
      const [fechasRes, sedesRes, categoriasRes] = await Promise.all([
        fetch("/api/admin/fechas"),
        fetch("/api/admin/sedes"),
        fetch("/api/admin/categorias"),
      ])
      const fechasData = await fechasRes.json()
      const sedesData = await sedesRes.json()
      const categoriasData = await categoriasRes.json()
      setFechas(fechasData.fechas || [])
      setSedes(sedesData.sedes || sedesData || [])
      setCategorias(categoriasData.categorias || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    const maxNumero = fechas.reduce((max, f) => Math.max(max, f.numero_fecha), 0)
    setFormData({
      numero_fecha: maxNumero + 1,
      fecha_calendario: "",
      sede_id: "",
      direccion: "",
      estado: "programada",
      temporada: new Date().getFullYear(),
      categoria_id: "",
      dias_torneo: 3,
      formato_zona: 3,
      duracion_partido_min: 60,
      hora_inicio_viernes: "18:00",
      hora_inicio_sabado: "18:00",
    })
  }

  function openCreateDialog() {
    resetForm()
    setEditingFecha(null)
    setDialogOpen(true)
  }

  function openEditDialog(fecha: FechaExtendida) {
    setEditingFecha(fecha)
    setFormData({
      numero_fecha: fecha.numero_fecha,
      fecha_calendario: fecha.fecha_calendario?.split("T")[0] || "",
      sede_id: fecha.sede || "",
      direccion: fecha.direccion || "",
      estado: fecha.estado,
      temporada: fecha.temporada,
      categoria_id: fecha.categoria_id?.toString() || "",
      dias_torneo: fecha.dias_torneo || 3,
      formato_zona: fecha.formato_zona || 3,
      duracion_partido_min: fecha.duracion_partido_min || 60,
      hora_inicio_viernes: fecha.hora_inicio_viernes || "18:00",
      hora_inicio_sabado: fecha.hora_inicio_sabado || "18:00",
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.categoria_id) {
      alert("Debes seleccionar una categoría")
      return
    }
    
    setSaving(true)

    try {
      const selectedSede = sedes.find(s => s.nombre === formData.sede_id || String(s.id) === formData.sede_id)
      
      const url = editingFecha 
        ? `/api/admin/fechas/${editingFecha.id}` 
        : "/api/admin/fechas"
      
      const res = await fetch(url, {
        method: editingFecha ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_fecha: formData.numero_fecha,
          fecha_calendario: formData.fecha_calendario,
          sede: selectedSede?.nombre || formData.sede_id,
          direccion: formData.direccion || selectedSede?.direccion || "",
          estado: formData.estado,
          temporada: formData.temporada,
          categoria_id: parseInt(formData.categoria_id),
          dias_torneo: formData.dias_torneo,
          formato_zona: formData.formato_zona,
          duracion_partido_min: formData.duracion_partido_min,
          hora_inicio_viernes: formData.hora_inicio_viernes,
          hora_inicio_sabado: formData.hora_inicio_sabado,
        }),
      })

      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving fecha:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingFecha) return

    try {
      const res = await fetch(`/api/admin/fechas/${deletingFecha.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeletingFecha(null)
        fetchData()
      }
    } catch (error) {
      console.error("Error deleting fecha:", error)
    }
  }

  function handleSedeChange(sedeName: string) {
    const selectedSede = sedes.find(s => s.nombre === sedeName)
    setFormData({
      ...formData,
      sede_id: sedeName,
      direccion: selectedSede?.direccion || "",
    })
  }

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
              <h1 className="text-3xl font-bold text-foreground">Gestión de Fechas</h1>
              <p className="text-muted-foreground">Cada fecha corresponde a un torneo de una categoría</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Fecha
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : fechas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg text-muted-foreground">No hay fechas registradas</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar primera fecha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="overflow-hidden border-border/50 bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Calendario</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    Programada
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mx-auto w-fit">
                  <MonthCalendar
                    mode="single"
                    selected={selectedCalendarDay}
                    onSelect={setSelectedCalendarDay}
                    modifiers={{
                      hasProgramada: calendarioMarkedDays.programada,
                      hasEnJuego: calendarioMarkedDays.en_juego,
                      hasFinalizada: calendarioMarkedDays.finalizada,
                    }}
                    modifiersClassNames={{
                      hasProgramada:
                        "relative rounded-full bg-primary/20 text-primary ring-2 ring-primary/40 hover:bg-primary/25 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                      hasEnJuego:
                        "relative rounded-full bg-blue-500/15 text-blue-600 ring-2 ring-blue-500/30 hover:bg-blue-500/20 dark:text-blue-400 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-blue-500",
                      hasFinalizada:
                        "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-muted-foreground/70",
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Próximas</span>
                  <Badge variant="secondary">{proximasFechas.length} fechas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proximasFechas.map((fecha) => {
                  const badgeInfo = getEstadoBadge(fecha.estado)
                  return (
                    <div
                      key={fecha.id}
                      className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="text-xl font-bold leading-none">
                          {fecha.fecha_calendario ? new Date(fecha.fecha_calendario).getDate() : "-"}
                        </span>
                        <span className="text-xs uppercase">
                          {fecha.fecha_calendario ? new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { month: 'short' }) : ""}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            Fecha {fecha.numero_fecha} - {fecha.categoria_nombre || "Sin categoría"}
                          </span>
                          <Badge variant="outline" className={badgeInfo.className}>
                            {badgeInfo.label}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {fecha.sede || "Sin sede"}
                          </span>
                          <span>Zonas de {fecha.formato_zona || 3} parejas</span>
                          <span>{fecha.dias_torneo || 3} días</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/admin/torneo/${fecha.id}`}>
                          <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                            <Users className="h-4 w-4" />
                            Gestionar
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(fecha)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingFecha(fecha)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Anteriores</span>
                  <Badge variant="secondary">{fechasAnteriores.length} fechas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fechasAnteriores.map((fecha) => {
                  const badgeInfo = getEstadoBadge(fecha.estado)
                  return (
                    <div
                      key={fecha.id}
                      className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <span className="text-xl font-bold leading-none">
                          {fecha.fecha_calendario ? new Date(fecha.fecha_calendario).getDate() : "-"}
                        </span>
                        <span className="text-xs uppercase">
                          {fecha.fecha_calendario ? new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { month: 'short' }) : ""}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            Fecha {fecha.numero_fecha} - {fecha.categoria_nombre || "Sin categoría"}
                          </span>
                          <Badge variant="outline" className={badgeInfo.className}>
                            {badgeInfo.label}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {fecha.sede || "Sin sede"}
                          </span>
                          <span>Zonas de {fecha.formato_zona || 3} parejas</span>
                          <span>{fecha.dias_torneo || 3} días</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/admin/torneo/${fecha.id}`}>
                          <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                            <Users className="h-4 w-4" />
                            Gestionar
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(fecha)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingFecha(fecha)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFecha ? "Editar Fecha" : "Nueva Fecha de Torneo"}
              </DialogTitle>
              <DialogDescription>
                {editingFecha 
                  ? "Modifica los datos de la fecha" 
                  : "Cada fecha es un torneo de una sola categoría"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                {/* CATEGORIA - Lo más importante primero */}
                <div className="grid gap-2">
                  <Label htmlFor="categoria" className="text-base font-semibold">
                    Categoría del Torneo *
                  </Label>
                  <Select
                    value={formData.categoria_id}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                  >
                    <SelectTrigger className={!formData.categoria_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="numero_fecha">Número de Fecha</Label>
                    <Input
                      id="numero_fecha"
                      type="number"
                      min={1}
                      value={formData.numero_fecha}
                      onChange={(e) => setFormData({ ...formData, numero_fecha: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="temporada">Temporada</Label>
                    <Input
                      id="temporada"
                      type="number"
                      value={formData.temporada}
                      onChange={(e) => setFormData({ ...formData, temporada: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fecha_calendario">Fecha de Inicio</Label>
                  <Input
                    id="fecha_calendario"
                    type="date"
                    value={formData.fecha_calendario}
                    onChange={(e) => setFormData({ ...formData, fecha_calendario: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sede">Sede</Label>
                  <Select value={formData.sede_id} onValueChange={handleSedeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.filter(s => s.activa !== false).map((sede) => (
                        <SelectItem key={sede.id} value={sede.nombre}>
                          {sede.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Configuración del Torneo */}
                <div className="border-t pt-4 mt-2">
                  <Label className="text-base font-semibold">Configuración del Torneo</Label>
  <div className="grid grid-cols-3 gap-3 mt-3">
  <div className="grid gap-2">
  <Label className="text-sm">Inicio Viernes</Label>
  <Input
  type="time"
  value={formData.hora_inicio_viernes}
  onChange={(e) => setFormData({ ...formData, hora_inicio_viernes: e.target.value })}
  />
  </div>
  <div className="grid gap-2">
  <Label className="text-sm">Inicio Sabado</Label>
  <Input
  type="time"
  value={formData.hora_inicio_sabado}
  onChange={(e) => setFormData({ ...formData, hora_inicio_sabado: e.target.value })}
  />
  </div>
  <div className="grid gap-2">
  <Label className="text-sm">Dias</Label>
                      <Input
                        type="number"
                        min={1}
                        max={7}
                        value={formData.dias_torneo}
                        onChange={(e) => setFormData({ ...formData, dias_torneo: parseInt(e.target.value) || 3 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm">Parejas/Zona</Label>
                      <Select
                        value={formData.formato_zona.toString()}
                        onValueChange={(val) => setFormData({ ...formData, formato_zona: parseInt(val) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 parejas</SelectItem>
                          <SelectItem value="4">4 parejas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm">Min/Partido</Label>
                      <Input
                        type="number"
                        min={30}
                        step={15}
                        value={formData.duracion_partido_min}
                        onChange={(e) => setFormData({ ...formData, duracion_partido_min: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: FechaTorneo['estado']) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programada">Programada</SelectItem>
                      <SelectItem value="en_juego">En Juego</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || !formData.categoria_id}>
                  {saving ? "Guardando..." : editingFecha ? "Actualizar" : "Crear Fecha"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar fecha?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará la Fecha {deletingFecha?.numero_fecha} - {deletingFecha?.categoria_nombre} 
                y todos sus datos asociados (parejas, partidos, etc).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  )
}
