"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { AdminWrapper } from "@/components/admin-wrapper"

export default function NuevaNoticiaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    titulo: "",
    contenido: "",
    autor: "",
    imagen_url: "",
    destacado: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/noticias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        router.push('/admin/noticias')
      }
    } catch (err) {
      console.error('Error creating noticia:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminWrapper
      title="Nueva Noticia"
      description="Publicar nuevo informe"
    >
      <main className="mx-auto max-w-2xl">
        <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/50 dark:bg-black/50">
          <CardHeader>
            <CardTitle>Datos de la Noticia</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Título de la noticia"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contenido">Contenido *</Label>
                <Textarea
                  id="contenido"
                  placeholder="Contenido de la noticia..."
                  value={formData.contenido}
                  onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                  rows={10}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="autor">Autor</Label>
                  <Input
                    id="autor"
                    placeholder="Nombre del autor"
                    value={formData.autor}
                    onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imagen_url">URL de Imagen</Label>
                  <Input
                    id="imagen_url"
                    type="url"
                    placeholder="https://..."
                    value={formData.imagen_url}
                    onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-background/50">
                <div>
                  <Label htmlFor="destacado" className="text-base">Noticia Destacada</Label>
                  <p className="text-sm text-muted-foreground">
                    Las noticias destacadas aparecen primero y con mayor prominencia
                  </p>
                </div>
                <Switch
                  id="destacado"
                  checked={formData.destacado}
                  onCheckedChange={(checked) => setFormData({ ...formData, destacado: checked })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1 rounded-xl shadow-lg shadow-primary/20">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publicar Noticia
                </Button>
                <Link href="/admin/noticias">
                  <Button type="button" variant="outline" className="rounded-xl">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </AdminWrapper>
  )
}
