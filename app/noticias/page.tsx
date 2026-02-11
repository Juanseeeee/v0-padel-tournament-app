import { sql, type Informe } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, ArrowRight, Tag } from "lucide-react"

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
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-card via-background to-card">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                <FileText className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h1 className="font-[var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
                  NOTICIAS
                </h1>
                <p className="text-muted-foreground">Informes y novedades de la liga</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          {informes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No hay noticias publicadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {informes.map((informe) => (
                <Card key={informe.id} className="transition-colors hover:border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground">{informe.titulo}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(informe.fecha_publicacion)}
                          </span>
                          {informe.etiquetas && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-4 w-4" />
                              {informe.etiquetas}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 line-clamp-2 text-muted-foreground">
                          {informe.contenido}
                        </p>
                      </div>
                      <Link href={`/noticias/${informe.id}`} className="self-start sm:self-center">
                        <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                          Leer más
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
