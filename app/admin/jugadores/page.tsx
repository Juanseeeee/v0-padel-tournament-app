"use client"

import React from "react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, Trash2, Search, Users, User, MapPin, Trophy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { AdminWrapper } from "@/components/admin-wrapper"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { Jugador, Categoria } from "@/lib/db"

export default function JugadoresAdminPage() {
  const [jugadores, setJugadores] = useState<(Jugador & { categorias_nombres?: string })[]>([])
  const [categorias, setCategorias] = useState<(Categoria & { genero?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoria, setFilterCategoria] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null)
  const [deletingJugador, setDeletingJugador] = useState<Jugador | null>(null)
  const [saving, setSaving] = useState(false)
  const [recatDialogOpen, setRecatDialogOpen] = useState(false)
  const [recatJugador, setRecatJugador] = useState<any>(null)
  const [recatCatAnteriorId, setRecatCatAnteriorId] = useState<string>("")
  const [recatCatNuevaId, setRecatCatNuevaId] = useState<string>("")
  const [recatTipo, setRecatTipo] = useState<"ascenso" | "descenso">("ascenso")
  const [recatSaving, setRecatSaving] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    localidad: "",
    genero: "masculino",
    categoria_ids: [] as number[],
    estado: "activo" as "activo" | "inactivo",
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [jugadoresRes, categoriasRes] = await Promise.all([
        fetch("/api/admin/jugadores"),
        fetch("/api/admin/categorias"),
      ])
      const jugadoresData = await jugadoresRes.json()
      const categoriasData = await categoriasRes.json()
      setJugadores(jugadoresData.jugadores || [])
      setCategorias(categoriasData.categorias || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter categories by selected gender
  const categoriasForGenero = useMemo(() => {
    return categorias.filter(cat => {
      const catGenero = (cat.genero || '').toUpperCase()
      const nombre = cat.nombre.toLowerCase()
      if (formData.genero === "masculino") {
        return catGenero === "MASCULINO" || nombre.includes("masculino") || nombre.includes("caballero") || nombre.includes("mixto") || nombre.includes("suma")
      } else {
        return catGenero === "FEMENINO" || nombre.includes("damas") || nombre.includes("femenino") || nombre.includes("dama") || nombre.includes("mixto") || nombre.includes("suma")
      }
    })
  }, [categorias, formData.genero])

  const filteredJugadores = jugadores.filter((j) => {
    const matchesSearch = `${j.nombre} ${j.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategoria = filterCategoria === "all" || 
      (j.categorias_nombres && j.categorias_nombres.includes(
        categorias.find(c => String(c.id) === filterCategoria)?.nombre || ""
      ))
    return matchesSearch && matchesCategoria
  })

  function openCreateDialog() {
    setEditingJugador(null)
    setFormData({
      nombre: "",
      apellido: "",
      localidad: "",
      genero: "masculino",
      categoria_ids: [],
      estado: "activo",
    })
    setDialogOpen(true)
  }

  function openEditDialog(jugador: any) {
    setEditingJugador(jugador)
    // Parse categoria_ids from the jugador data
    const catIds = jugador.categoria_ids 
      ? (typeof jugador.categoria_ids === 'string' 
          ? jugador.categoria_ids.split(',').map(Number).filter((n: number) => !isNaN(n) && n > 0) 
          : Array.isArray(jugador.categoria_ids) ? jugador.categoria_ids : [])
      : (jugador.categoria_actual_id ? [jugador.categoria_actual_id] : [])
    
    setFormData({
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      localidad: jugador.localidad || "",
      genero: jugador.genero,
      categoria_ids: catIds,
      estado: jugador.estado,
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(jugador: Jugador) {
    setDeletingJugador(jugador)
    setDeleteDialogOpen(true)
  }

  function toggleCategoria(catId: number) {
    setFormData(prev => {
      const current = prev.categoria_ids
      if (current.includes(catId)) {
        return { ...prev, categoria_ids: current.filter(id => id !== catId) }
      }
      if (current.length >= 3) return prev // max 3
      return { ...prev, categoria_ids: [...current, catId] }
    })
  }

  // When gender changes, clear categories that don't match
  function handleGeneroChange(genero: string) {
    setFormData(prev => ({ ...prev, genero, categoria_ids: [] }))
  }

  function openRecatDialog(jugador: any) {
    setRecatJugador(jugador)
    const catIds = jugador.categoria_ids
      ? (typeof jugador.categoria_ids === 'string'
          ? jugador.categoria_ids.split(',').map(Number).filter((n: number) => !isNaN(n) && n > 0)
          : Array.isArray(jugador.categoria_ids) ? jugador.categoria_ids : [])
      : (jugador.categoria_actual_id ? [jugador.categoria_actual_id] : [])
    setRecatCatAnteriorId(catIds.length > 0 ? String(catIds[0]) : "")
    setRecatCatNuevaId("")
    setRecatTipo("ascenso")
    setRecatDialogOpen(true)
  }

  async function handleRecategorizar() {
    if (!recatJugador || !recatCatNuevaId) return
    setRecatSaving(true)
    try {
      const res = await fetch("/api/admin/jugadores/recategorizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jugador_id: recatJugador.id,
          categoria_anterior_id: recatCatAnteriorId ? Number(recatCatAnteriorId) : null,
          categoria_nueva_id: Number(recatCatNuevaId),
          tipo: recatTipo,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        setRecatDialogOpen(false)
        fetchData()
      } else {
        alert(data.error || "Error al recategorizar")
      }
    } catch (error) {
      console.error("Error en recategorizacion:", error)
    } finally {
      setRecatSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.categoria_ids.length === 0) {
      alert("Debe seleccionar al menos 1 categoria")
      return
    }
    setSaving(true)

    try {
      const url = editingJugador 
        ? `/api/admin/jugadores/${editingJugador.id}` 
        : "/api/admin/jugadores"
      
      const res = await fetch(url, {
        method: editingJugador ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          categoria_actual_id: formData.categoria_ids[0] || null,
          categoria_ids: formData.categoria_ids,
        }),
      })

      if (res.ok) {
        setDialogOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error("Error saving jugador:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingJugador) return

    try {
      const res = await fetch(`/api/admin/jugadores/${deletingJugador.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeletingJugador(null)
        fetchData()
      }
    } catch (error) {
      console.error("Error deleting jugador:", error)
    }
  }

  return (
    <AdminWrapper
        title="Gestión de Jugadores"
        description="Administra los jugadores de la liga"
        headerActions={
            <Button onClick={openCreateDialog} className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Nuevo Jugador
            </Button>
        }
    >
        {/* Filters */}
        <Card className="mb-6 border-none shadow-lg bg-card/95 backdrop-blur-sm ring-1 ring-border/50">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl border-input/50 bg-background/50"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full sm:w-48 h-10 rounded-xl border-input/50 bg-background/50">
                <SelectValue placeholder="Todas las categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse border-none shadow-sm bg-card/50">
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : filteredJugadores.length === 0 ? (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mb-4 text-lg text-muted-foreground font-medium">
                {searchTerm || filterCategoria !== "all" 
                  ? "No se encontraron jugadores" 
                  : "No hay jugadores registrados"
                }
              </p>
              {!searchTerm && filterCategoria === "all" && (
                <Button onClick={openCreateDialog} className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Agregar primer jugador
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-2xl overflow-hidden ring-1 ring-border/50">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg font-bold">Lista de Jugadores</span>
                <Badge variant="secondary" className="rounded-lg">{filteredJugadores.length} jugadores</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                {filteredJugadores.map((jugador) => (
                    <div
                    key={jugador.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                    >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold">
                            {jugador.nombre.charAt(0)}{jugador.apellido.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-foreground text-base">
                                {jugador.nombre} {jugador.apellido}
                            </span>
                            {jugador.estado === "inactivo" && (
                                <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 text-[10px] h-5">
                                Inactivo
                                </Badge>
                            )}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {jugador.categorias_nombres && jugador.categorias_nombres.split(', ').map((catName: string) => (
                                    <Badge key={catName} variant="outline" className="text-[10px] h-5 border-primary/20 text-primary/80 bg-primary/5">{catName}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full sm:w-auto flex justify-between sm:justify-end items-center gap-4 sm:gap-8">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Puntos</span>
                            <div className="flex items-center gap-1 text-lg font-black text-primary">
                                <Trophy className="h-3 w-3" />
                                {jugador.puntos_totales || 0}
                            </div>
                        </div>

                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditDialog(jugador)} title="Editar">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => openRecatDialog(jugador)} title="Recategorizar">
                            <ArrowUpDown className="h-4 w-4" />
                            </Button>
                            {/* <Link href={`/jugador/${jugador.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Ver perfil">
                                <User className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            </Link> */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(jugador)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold">
                {editingJugador ? "Editar Jugador" : "Nuevo Jugador"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {editingJugador 
                  ? "Modifica los datos del jugador" 
                  : "Ingresa los datos del nuevo jugador"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      required
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="localidad">Localidad</Label>
                  <Input
                    id="localidad"
                    value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                    placeholder="Ej: Buenos Aires"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="genero">Genero *</Label>
                    <Select
                      value={formData.genero}
                      onValueChange={handleGeneroChange}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value: "activo" | "inactivo") => setFormData({ ...formData, estado: value })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Categorias * <span className="text-xs text-muted-foreground">(min 1, max 3)</span></Label>
                  <div className="rounded-xl border border-border p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {categoriasForGenero.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay categorias disponibles para este genero</p>
                    ) : (
                      categoriasForGenero.map(cat => (
                        <label key={cat.id} className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={formData.categoria_ids.includes(cat.id)}
                            onCheckedChange={() => toggleCategoria(cat.id)}
                            disabled={!formData.categoria_ids.includes(cat.id) && formData.categoria_ids.length >= 3}
                          />
                          <span className="text-sm">{cat.nombre}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {formData.categoria_ids.length === 0 && (
                    <p className="text-xs text-destructive">Selecciona al menos 1 categoria</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || formData.categoria_ids.length === 0} className="rounded-xl shadow-lg shadow-primary/20">
                  {saving ? "Guardando..." : editingJugador ? "Guardar cambios" : "Crear jugador"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Recategorizar Dialog */}
        <Dialog open={recatDialogOpen} onOpenChange={setRecatDialogOpen}>
            <DialogContent className="max-w-sm rounded-3xl border-none shadow-2xl bg-card">
                <DialogHeader>
                    <DialogTitle className="text-center">Recategorizar Jugador</DialogTitle>
                    <DialogDescription className="text-center">
                        {recatJugador?.nombre} {recatJugador?.apellido}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Categoría Anterior (a remover)</Label>
                        <Select value={recatCatAnteriorId} onValueChange={setRecatCatAnteriorId}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Ninguna" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Ninguna</SelectItem>
                                {recatJugador?.categoria_ids && (
                                  Array.isArray(recatJugador.categoria_ids) 
                                    ? recatJugador.categoria_ids.map((id: number) => {
                                        const cat = categorias.find(c => c.id === id);
                                        return cat ? <SelectItem key={id} value={String(id)}>{cat.nombre}</SelectItem> : null
                                      })
                                    : typeof recatJugador.categoria_ids === 'string'
                                      ? recatJugador.categoria_ids.split(',').map((idStr: string) => {
                                          const id = Number(idStr);
                                          const cat = categorias.find(c => c.id === id);
                                          return cat ? <SelectItem key={id} value={String(id)}>{cat.nombre}</SelectItem> : null
                                        })
                                      : null
                                )}
                                
                                {/* Fallback if no category ids but has current category */}
                                {(!recatJugador?.categoria_ids && recatJugador?.categoria_actual_id) && 
                                    (() => {
                                        const cat = categorias.find(c => c.id === recatJugador.categoria_actual_id);
                                        return cat ? <SelectItem value={String(cat.id)}>{cat.nombre}</SelectItem> : null
                                    })()
                                }
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Tipo de Movimiento</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                type="button" 
                                variant={recatTipo === 'ascenso' ? 'default' : 'outline'}
                                onClick={() => setRecatTipo('ascenso')}
                                className="rounded-xl"
                            >
                                <ArrowUp className="mr-2 h-4 w-4" /> Ascenso
                            </Button>
                            <Button 
                                type="button" 
                                variant={recatTipo === 'descenso' ? 'default' : 'outline'}
                                onClick={() => setRecatTipo('descenso')}
                                className="rounded-xl"
                            >
                                <ArrowDown className="mr-2 h-4 w-4" /> Descenso
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Nueva Categoría (a agregar)</Label>
                        <Select value={recatCatNuevaId} onValueChange={setRecatCatNuevaId}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                {categorias.filter(cat => {
                                    if (!recatJugador) return true;
                                    const catGenero = (cat.genero || '').toUpperCase();
                                    const nombre = cat.nombre.toLowerCase();
                                    const jugGenero = recatJugador.genero || 'masculino';
                                    if (jugGenero === "masculino") {
                                        return catGenero === "MASCULINO" || nombre.includes("masculino") || nombre.includes("caballero") || nombre.includes("mixto") || nombre.includes("suma");
                                    } else {
                                        return catGenero === "FEMENINO" || nombre.includes("damas") || nombre.includes("femenino") || nombre.includes("dama") || nombre.includes("mixto") || nombre.includes("suma");
                                    }
                                }).map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setRecatDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                    <Button onClick={handleRecategorizar} disabled={recatSaving || !recatCatNuevaId} className="rounded-xl">
                        {recatSaving ? 'Guardando...' : 'Confirmar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente al jugador
                <strong> {deletingJugador?.nombre} {deletingJugador?.apellido}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </AdminWrapper>
  )
}
