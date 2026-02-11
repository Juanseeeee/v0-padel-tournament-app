"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, ArrowLeft, Edit, Trash2, MoreHorizontal, Plus, Calendar, Star
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import type { Informe } from "@/lib/db"

const fetcher = (url: string) => fetch(url).then(res => res.json())

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function AdminNoticiasPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { data, error, isLoading, mutate } = useSWR<{ informes: Informe[] }>('/api/admin/noticias', fetcher)

  const informes = data?.informes || []

  async function handleDelete() {
    if (!deleteId) return
    
    try {
      const res = await fetch(`/api/admin/noticias/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        mutate()
      }
    } catch (err) {
      console.error('Error deleting noticia:', err)
    }
    setDeleteId(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h1 className="font-[var(--font-display)] text-xl tracking-wide text-foreground">
                NOTICIAS
              </h1>
              <p className="text-xs text-muted-foreground">Gestión de informes</p>
            </div>
          </div>
          <Link href="/admin/noticias/nueva">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Noticia
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Noticias</span>
              <Badge variant="secondary">{informes.length} noticias</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Cargando...</div>
            ) : error ? (
              <div className="py-12 text-center text-destructive">Error al cargar noticias</div>
            ) : informes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No hay noticias publicadas
              </div>
            ) : (
              <div className="space-y-3">
                {informes.map((informe) => (
                  <div 
                    key={informe.id} 
                    className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {informe.titulo}
                        </span>
                        {informe.destacado && (
                          <Badge className="bg-accent text-accent-foreground gap-1">
                            <Star className="h-3 w-3" />
                            Destacado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(informe.fecha_publicacion)}
                        </span>
                        {informe.autor && (
                          <span>por {informe.autor}</span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/noticias/${informe.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/noticias/${informe.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Público
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeleteId(informe.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar noticia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La noticia será eliminada permanentemente.
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
  )
}
