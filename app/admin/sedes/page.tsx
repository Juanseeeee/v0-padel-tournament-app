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
import { AdminWrapper } from "@/components/admin-wrapper"
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
    <AdminWrapper
      title="Gestión de Sedes"
      description="Administra las sedes donde se juegan los torneos"
      headerActions={
        <Button onClick={openCreateDialog} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          Nueva Sede
        </Button>
      }
    >
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-none shadow-md bg-card/50">
                <CardHeader className="h-20 bg-muted/50 rounded-t-xl" />
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : sedes.length === 0 ? (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg text-muted-foreground">No hay sedes registradas</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar primera sede
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4">
            {sedes.map((sede, idx) => (
              <Card 
                key={sede.id} 
                className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/95 backdrop-blur-sm ring-1 ring-border/50 group overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Building2 className="h-24 w-24" />
                </div>

                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative z-10">
                  <div>
                    <CardTitle className="text-lg font-bold">{sede.nombre}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={sede.activa 
                        ? "mt-1 bg-primary/10 text-primary border-primary/20" 
                        : "mt-1 bg-muted text-muted-foreground border-border"
                      }
                    >
                      {sede.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-background/80"
                      onClick={() => openEditDialog(sede)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteDialog(sede)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground relative z-10 pt-2">
                  {sede.direccion && (
                    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{sede.direccion}</span>
                    </div>
                  )}
                  {sede.localidad && (
                    <div className="flex items-center gap-2 px-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>{sede.localidad}</span>
                    </div>
                  )}
                  {sede.telefono && (
                    <div className="flex items-center gap-2 px-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{sede.telefono}</span>
                    </div>
                  )}
                  <div className="pt-2 text-xs px-2 flex items-center justify-between border-t border-border/10 mt-2">
                    <span>Capacidad:</span>
                    <span className="font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-full">{sede.capacidad_canchas} canchas</span>
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
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Ej: Av. Principal 1234"
                    className="rounded-xl"
                  />
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
                    <Label htmlFor="capacidad_canchas">Canchas</Label>
                    <Input
                      id="capacidad_canchas"
                      type="number"
                      min={1}
                      value={formData.capacidad_canchas}
                      onChange={(e) => setFormData({ ...formData, capacidad_canchas: parseInt(e.target.value) || 1 })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="Ej: +54 11 1234-5678"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-xl">
                  <Switch
                    id="activa"
                    checked={formData.activa}
                    onCheckedChange={(checked) => setFormData({ ...formData, activa: checked })}
                  />
                  <Label htmlFor="activa" className="cursor-pointer">Sede activa para torneos</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
                  {saving ? "Guardando..." : editingSede ? "Guardar cambios" : "Crear sede"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar sede?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la sede 
                <span className="font-semibold text-foreground"> {deletingSede?.nombre}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-lg shadow-destructive/20">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </AdminWrapper>
  )
}
