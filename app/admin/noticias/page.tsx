"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, Edit, Trash2, Plus, Calendar, Star, User
} from "lucide-react"
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
import { AdminWrapper } from "@/components/admin-wrapper"
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
    <AdminWrapper
      title="Gestión de Noticias"
      description="Publica y administra las noticias e informes del torneo"
      headerActions={
        <Link href="/admin/noticias/nueva">
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            Nueva Noticia
          </Button>
        </Link>
      }
    >
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-none shadow-md bg-card/50">
                <CardHeader className="h-20 bg-muted/50 rounded-t-xl" />
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-destructive">
              <p>Error al cargar noticias</p>
              <Button variant="outline" onClick={() => mutate()} className="mt-4 border-destructive/30 hover:bg-destructive/10">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : informes.length === 0 ? (
          <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-4 text-lg text-muted-foreground">No hay noticias publicadas</p>
              <Link href="/admin/noticias/nueva">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primera noticia
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4">
            {informes.map((informe, idx) => (
              <Card 
                key={informe.id} 
                className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/95 backdrop-blur-sm ring-1 ring-border/50 group overflow-hidden flex flex-col"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <FileText className="h-24 w-24" />
                </div>
                
                <CardHeader className="pb-2 relative z-10">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(informe.fecha_publicacion)}
                    </Badge>
                    {informe.destacado && (
                      <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20 gap-1 shadow-none">
                        <Star className="h-3 w-3 fill-yellow-600" />
                        Destacado
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold line-clamp-2 leading-tight min-h-[3rem]">
                    {informe.titulo}
                  </CardTitle>
                  {informe.autor && (
                    <CardDescription className="flex items-center gap-1 text-xs pt-1">
                      <User className="h-3 w-3" />
                      {informe.autor}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="flex-1 relative z-10 flex flex-col justify-end pt-0">
                  <div className="flex items-center justify-between pt-4 mt-auto border-t border-border/10">
                    <Link href={`/noticias/${informe.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Ver publicación
                    </Link>
                    
                    <div className="flex gap-1">
                      <Link href={`/admin/noticias/${informe.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(informe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar noticia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La noticia será eliminada permanentemente.
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
