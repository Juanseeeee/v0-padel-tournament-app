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
              <h1 className="text-3xl font-bold text-foreground">Gestion de Jugadores</h1>
              <p className="text-muted-foreground">Administra los jugadores de la liga</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Jugador
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full sm:w-48">
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
              <Card key={i} className="animate-pulse">
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : filteredJugadores.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg text-muted-foreground">
                {searchTerm || filterCategoria !== "all" 
                  ? "No se encontraron jugadores" 
                  : "No hay jugadores registrados"
                }
              </p>
              {!searchTerm && filterCategoria === "all" && (
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar primer jugador
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lista de Jugadores</span>
                <Badge variant="secondary">{filteredJugadores.length} jugadores</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredJugadores.map((jugador) => (
                <div
                  key={jugador.id}
                  className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {jugador.nombre} {jugador.apellido}
                      </span>
                      {jugador.categorias_nombres && jugador.categorias_nombres.split(', ').map((catName: string) => (
                        <Badge key={catName} variant="outline" className="text-xs">{catName}</Badge>
                      ))}
                      {jugador.estado === "inactivo" && (
                        <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {jugador.localidad && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {jugador.localidad}
                        </span>
                      )}
                      <span className="capitalize">{jugador.genero}</span>
                    </div>
                  </div>
                  <div className="mr-4 text-right">
                    <div className="flex items-center gap-1 text-xl font-bold text-primary">
                      <Trophy className="h-4 w-4" />
                      {jugador.puntos_totales || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">puntos</div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(jugador)} title="Editar">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700" onClick={() => openRecatDialog(jugador)} title="Recategorizar">
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                    <Link href={`/jugador/${jugador.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver perfil">
                        <User className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(jugador)} title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingJugador ? "Editar Jugador" : "Nuevo Jugador"}
              </DialogTitle>
              <DialogDescription>
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
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      required
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="genero">Genero *</Label>
                    <Select
                      value={formData.genero}
                      onValueChange={handleGeneroChange}
                    >
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    {categoriasForGenero.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay categorias disponibles para este genero</p>
                    ) : (
                      categoriasForGenero.map(cat => (
                        <label key={cat.id} className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || formData.categoria_ids.length === 0}>
                  {saving ? "Guardando..." : editingJugador ? "Guardar cambios" : "Crear jugador"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar jugador?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion no se puede deshacer. Se eliminara permanentemente al jugador 
                <span className="font-semibold"> {deletingJugador?.nombre} {deletingJugador?.apellido}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Recategorizar Dialog */}
        <Dialog open={recatDialogOpen} onOpenChange={setRecatDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-amber-600" />
                Recategorizar Jugador
              </DialogTitle>
              <DialogDescription>
                {recatJugador && `${recatJugador.nombre} ${recatJugador.apellido}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tipo de recategorizacion</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={recatTipo === "ascenso" ? "default" : "outline"}
                    className={recatTipo === "ascenso" ? "flex-1 gap-2 bg-green-600 hover:bg-green-700" : "flex-1 gap-2"}
                    onClick={() => setRecatTipo("ascenso")}
                  >
                    <ArrowUp className="h-4 w-4" />
                    Ascenso
                  </Button>
                  <Button
                    type="button"
                    variant={recatTipo === "descenso" ? "default" : "outline"}
                    className={recatTipo === "descenso" ? "flex-1 gap-2 bg-red-600 hover:bg-red-700" : "flex-1 gap-2"}
                    onClick={() => setRecatTipo("descenso")}
                  >
                    <ArrowDown className="h-4 w-4" />
                    Descenso
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Categoria actual</Label>
                <Select value={recatCatAnteriorId} onValueChange={setRecatCatAnteriorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoria actual" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Nueva categoria</Label>
                <Select value={recatCatNuevaId} onValueChange={setRecatCatNuevaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar nueva categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias
                      .filter(cat => String(cat.id) !== recatCatAnteriorId)
                      .map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {recatCatAnteriorId && recatCatNuevaId && (
                <div className={`rounded-lg border p-3 text-sm ${recatTipo === "ascenso" ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                  <p className="font-medium">
                    {recatTipo === "ascenso" ? "ASCENSO" : "DESCENSO"}: {recatJugador?.nombre} {recatJugador?.apellido}
                  </p>
                  <p className="mt-1">
                    {categorias.find(c => String(c.id) === recatCatAnteriorId)?.nombre || "?"} → {categorias.find(c => String(c.id) === recatCatNuevaId)?.nombre || "?"}
                  </p>
                  <p className="mt-1 text-xs opacity-75">Se generara automaticamente una noticia con esta recategorizacion.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecatDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleRecategorizar}
                disabled={recatSaving || !recatCatNuevaId}
                className={recatTipo === "ascenso" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {recatSaving ? "Procesando..." : `Confirmar ${recatTipo}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
