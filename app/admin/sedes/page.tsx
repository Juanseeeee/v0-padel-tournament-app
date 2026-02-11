"use client"

import React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, Trash2, MapPin, Phone, Building2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import type { Sede } from "@/lib/db"

export default function SedesAdminPage() {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingSede, setEditingSede] = useState<Sede | null>(null)
  const [deletingSede, setDeletingSede] = useState<Sede | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    localidad: "",
    capacidad_canchas: 1,
    telefono: "",
    activa: true,
  })

  useEffect(() => {
    fetchSedes()
  }, [])

  async function fetchSedes() {
    try {
      const res = await fetch("/api/admin/sedes")
      const data = await res.json()
      setSedes(data)
    } catch (error) {
      console.error("Error fetching sedes:", error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingSede(null)
    setFormData({
      nombre: "",
      direccion: "",
      localidad: "",
      capacidad_canchas: 1,
      telefono: "",
      activa: true,
    })
    setDialogOpen(true)
  }

  function openEditDialog(sede: Sede) {
    setEditingSede(sede)
    setFormData({
      nombre: sede.nombre,
      direccion: sede.direccion || "",
      localidad: sede.localidad || "",
      capacidad_canchas: sede.capacidad_canchas,
      telefono: sede.telefono || "",
      activa: sede.activa,
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(sede: Sede) {
    setDeletingSede(sede)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingSede 
        ? `/api/admin/sedes/${editingSede.id}` 
        : "/api/admin/sedes"
      
      const res = await fetch(url, {
        method: editingSede ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setDialogOpen(false)
        fetchSedes()
      }
    } catch (error) {
      console.error("Error saving sede:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingSede) return

    try {
      const res = await fetch(`/api/admin/sedes/${deletingSede.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeletingSede(null)
        fetchSedes()
      }
    } catch (error) {
      console.error("Error deleting sede:", error)
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
              <h1 className="text-3xl font-bold text-foreground">Gestión de Sedes</h1>
              <p className="text-muted-foreground">Administra las sedes donde se juegan los torneos</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Sede
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-20 bg-muted" />
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : sedes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg text-muted-foreground">No hay sedes registradas</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar primera sede
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sedes.map((sede) => (
              <Card key={sede.id} className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{sede.nombre}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={sede.activa 
                        ? "mt-1 bg-primary/20 text-primary border-primary/30" 
                        : "mt-1 bg-muted text-muted-foreground"
                      }
                    >
                      {sede.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(sede)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(sede)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {sede.direccion && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{sede.direccion}</span>
                    </div>
                  )}
                  {sede.localidad && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{sede.localidad}</span>
                    </div>
                  )}
                  {sede.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{sede.telefono}</span>
                    </div>
                  )}
                  <div className="pt-2 text-xs">
                    <span className="text-primary font-medium">{sede.capacidad_canchas}</span> canchas disponibles
                  </div>
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
                {editingSede ? "Editar Sede" : "Nueva Sede"}
              </DialogTitle>
              <DialogDescription>
                {editingSede 
                  ? "Modifica los datos de la sede" 
                  : "Ingresa los datos de la nueva sede"
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
                    placeholder="Ej: Club Deportivo Norte"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Ej: Av. Principal 1234"
                  />
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
                    <Label htmlFor="capacidad_canchas">Cantidad de Canchas</Label>
                    <Input
                      id="capacidad_canchas"
                      type="number"
                      min={1}
                      value={formData.capacidad_canchas}
                      onChange={(e) => setFormData({ ...formData, capacidad_canchas: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="Ej: +54 11 1234-5678"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="activa"
                    checked={formData.activa}
                    onCheckedChange={(checked) => setFormData({ ...formData, activa: checked })}
                  />
                  <Label htmlFor="activa">Sede activa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : editingSede ? "Guardar cambios" : "Crear sede"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar sede?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la sede 
                <span className="font-semibold"> {deletingSede?.nombre}</span>.
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
      </div>
    </main>
  )
}
