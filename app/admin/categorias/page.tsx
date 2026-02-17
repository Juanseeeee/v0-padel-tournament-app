"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, Layers, ArrowUpDown } from "lucide-react"
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
import { AdminWrapper } from "@/components/admin-wrapper"
import type { Categoria } from "@/lib/db"

export default function CategoriasAdminPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [deletingCategoria, setDeletingCategoria] = useState<Categoria | null>(null)
  const [saving, setSaving] = useState(false)
  const [jugadoresPorCategoria, setJugadoresPorCategoria] = useState<Record<number, number>>({})

  const [formData, setFormData] = useState({
    nombre: "",
    orden_nivel: 1,
  })

  useEffect(() => {
    fetchCategorias()
  }, [])

  async function fetchCategorias() {
    try {
      const res = await fetch("/api/admin/categorias")
      const data = await res.json()
      setCategorias(data.categorias || [])
      setJugadoresPorCategoria(data.jugadoresPorCategoria || {})
    } catch (error) {
      console.error("Error fetching categorias:", error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingCategoria(null)
    setFormData({
      nombre: "",
      orden_nivel: categorias.length + 1,
    })
    setDialogOpen(true)
  }

  function openEditDialog(categoria: Categoria) {
    setEditingCategoria(categoria)
    setFormData({
      nombre: categoria.nombre,
      orden_nivel: categoria.orden_nivel,
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(categoria: Categoria) {
    setDeletingCategoria(categoria)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingCategoria 
        ? `/api/admin/categorias/${editingCategoria.id}` 
        : "/api/admin/categorias"
      
      const res = await fetch(url, {
        method: editingCategoria ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setDialogOpen(false)
        fetchCategorias()
      }
    } catch (error) {
      console.error("Error saving categoria:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingCategoria) return

    try {
      const res = await fetch(`/api/admin/categorias/${deletingCategoria.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeletingCategoria(null)
        fetchCategorias()
      }
    } catch (error) {
      console.error("Error deleting categoria:", error)
    }
  }

  return (
    <AdminWrapper
        title="Gestión de Categorías"
        description="Administra las categorías de la liga y sus niveles"
        headerActions={
            <Button onClick={openCreateDialog} className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Nueva Categoría
            </Button>
        }
    >
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-none shadow-md bg-card/50">
                <CardHeader className="h-20 bg-muted/50 rounded-t-xl" />
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : categorias.length === 0 ? (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-4 text-lg text-muted-foreground">No hay categorías registradas</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar primera categoría
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4">
            {categorias.map((categoria, idx) => (
              <Card 
                key={categoria.id} 
                className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/95 backdrop-blur-sm ring-1 ring-border/50 group overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Layers className="h-24 w-24" />
                </div>
                
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative z-10">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">{categoria.nombre}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-secondary/10 text-secondary-foreground border-secondary/20">
                        <ArrowUpDown className="mr-1 h-3 w-3" />
                        Nivel {categoria.orden_nivel}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-background/80"
                      onClick={() => openEditDialog(categoria)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteDialog(categoria)}
                      disabled={(jugadoresPorCategoria[categoria.id] || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg w-fit">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {jugadoresPorCategoria[categoria.id] || 0}
                    </span>
                    <span>jugadores registrados</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingCategoria ? "Editar Categoría" : "Nueva Categoría"}
              </DialogTitle>
              <DialogDescription>
                {editingCategoria 
                  ? "Modifica los datos de la categoría y su nivel." 
                  : "Ingresa los datos para crear una nueva categoría."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Primera, Segunda, Tercera..."
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orden_nivel" className="text-sm font-medium">Orden / Nivel</Label>
                  <Input
                    id="orden_nivel"
                    type="number"
                    min={1}
                    value={formData.orden_nivel}
                    onChange={(e) => setFormData({ ...formData, orden_nivel: parseInt(e.target.value) || 1 })}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
                    El nivel más bajo (1) es la categoría más alta. Los jugadores ascienden hacia niveles menores.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
                  {saving ? "Guardando..." : editingCategoria ? "Guardar Cambios" : "Crear Categoría"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente la categoría 
                <span className="font-semibold text-foreground"> {deletingCategoria?.nombre}</span>.
                {(jugadoresPorCategoria[deletingCategoria?.id || 0] || 0) > 0 && (
                  <span className="block mt-2 p-2 bg-destructive/10 text-destructive rounded-lg font-medium">
                    ⚠️ No se puede eliminar porque tiene jugadores asignados.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-lg shadow-destructive/20"
                disabled={(jugadoresPorCategoria[deletingCategoria?.id || 0] || 0) > 0}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </AdminWrapper>
  )
}
