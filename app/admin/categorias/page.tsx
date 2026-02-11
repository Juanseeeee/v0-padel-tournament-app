"use client"

import React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, Trash2, Layers, ArrowUpDown } from "lucide-react"
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
              <h1 className="text-3xl font-bold text-foreground">Gestión de Categorías</h1>
              <p className="text-muted-foreground">Administra las categorías de la liga</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Categoría
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-16 bg-muted" />
                <CardContent className="h-16" />
              </Card>
            ))}
          </div>
        ) : categorias.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg text-muted-foreground">No hay categorías registradas</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar primera categoría
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categorias.map((categoria) => (
              <Card key={categoria.id} className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{categoria.nombre}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                        <ArrowUpDown className="mr-1 h-3 w-3" />
                        Nivel {categoria.orden_nivel}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(categoria)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(categoria)}
                      disabled={(jugadoresPorCategoria[categoria.id] || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-medium">
                      {jugadoresPorCategoria[categoria.id] || 0}
                    </span> jugadores en esta categoría
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategoria ? "Editar Categoría" : "Nueva Categoría"}
              </DialogTitle>
              <DialogDescription>
                {editingCategoria 
                  ? "Modifica los datos de la categoría" 
                  : "Ingresa los datos de la nueva categoría"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Primera, Segunda, Tercera..."
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orden_nivel">Orden / Nivel</Label>
                  <Input
                    id="orden_nivel"
                    type="number"
                    min={1}
                    value={formData.orden_nivel}
                    onChange={(e) => setFormData({ ...formData, orden_nivel: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    El nivel más bajo (1) es la categoría más alta. Los jugadores ascienden hacia niveles menores.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : editingCategoria ? "Guardar cambios" : "Crear categoría"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la categoría 
                <span className="font-semibold"> {deletingCategoria?.nombre}</span>.
                {(jugadoresPorCategoria[deletingCategoria?.id || 0] || 0) > 0 && (
                  <span className="block mt-2 text-destructive">
                    No se puede eliminar porque tiene jugadores asignados.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={(jugadoresPorCategoria[deletingCategoria?.id || 0] || 0) > 0}
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
