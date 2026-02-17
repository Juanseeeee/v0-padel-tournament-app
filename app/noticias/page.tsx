import { sql, type Informe } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, ArrowRight, Tag, Newspaper } from "lucide-react"

async function getInformes(): Promise<Informe[]> {
  const result = await sql`
    SELECT * FROM informes
    WHERE publicado = true
    ORDER BY fecha_publicacion DESC
  `
  return result as Informe[]
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default async function NoticiasPage() {
  const informes = await getInformes()

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden font-sans">
      <Header />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <main className="relative z-10">
        {/* Curved Hero Section */}
        <section className="relative w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-12 pb-32 text-white shadow-2xl transition-all overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-6 ring-1 ring-white/20 shadow-lg">
              <Newspaper className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-white drop-shadow-sm">
              NOTICIAS
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto font-medium">
              Informes y novedades de la liga
            </p>
          </div>
        </section>

        <div className="relative z-20 -mt-20 mx-auto max-w-7xl px-4 pb-20 space-y-8">
          {informes.length === 0 ? (
            <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-[2rem] overflow-hidden ring-1 ring-border/50">
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Sin noticias</h3>
                <p className="text-muted-foreground">No hay noticias publicadas en este momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {informes.map((informe, index) => (
                <div 
                    key={informe.id}
                    className="animate-in fade-in slide-in-from-bottom-8 duration-700"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <Card className="group overflow-hidden border-none shadow-md bg-card/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ring-1 ring-border/50 rounded-2xl">
                    <CardContent className="p-0 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Icon/Image Placeholder */}
                            <div className="hidden sm:flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/10 group-hover:scale-105 transition-transform duration-500">
                                <FileText className="h-12 w-12 opacity-80" />
                            </div>

                            <div className="flex-1 p-6 sm:p-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                                            <Calendar className="mr-1 h-3 w-3" />
                                            {formatDate(informe.fecha_publicacion)}
                                        </Badge>
                                        {informe.etiquetas && (
                                            <Badge variant="outline" className="text-muted-foreground">
                                                <Tag className="mr-1 h-3 w-3" />
                                                {informe.etiquetas}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                                        {informe.titulo}
                                    </h3>
                                    
                                    <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                                        {informe.contenido}
                                    </p>
                                </div>

                                <div className="mt-6 flex items-center justify-end sm:justify-start">
                                    <Link href={`/noticias/${informe.id}`}>
                                        <Button className="group/btn gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                                            Leer noticia completa
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
