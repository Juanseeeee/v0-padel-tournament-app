import { sql, type Informe } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Tag, FileDown } from "lucide-react"

async function getInforme(id: string): Promise<Informe | null> {
  const result = await sql`SELECT * FROM informes WHERE id = ${id} AND publicado = true`
  return result[0] as Informe | null
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const informe = await getInforme(id)

  if (!informe) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
          <Link href="/noticias">
            <Button variant="ghost" size="sm" className="mb-6 gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Volver a Noticias
            </Button>
          </Link>

          <header className="mb-8">
            {informe.etiquetas && (
              <div className="mb-4 flex flex-wrap gap-2">
                {informe.etiquetas.split(',').map((etiqueta, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {etiqueta.trim()}
                  </Badge>
                ))}
              </div>
            )}
            <h1 className="font-[var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl lg:text-4xl">
              {informe.titulo.toUpperCase()}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(informe.fecha_publicacion)}
              </span>
            </div>
          </header>

          <div className="prose prose-invert max-w-none">
            {informe.contenido.split('\n').map((paragraph, index) => (
              <p key={index} className="text-foreground/90 leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          {informe.archivo_adjunto_url && (
            <div className="mt-8 rounded-lg border border-border bg-card/50 p-4">
              <a 
                href={informe.archivo_adjunto_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-primary hover:underline"
              >
                <FileDown className="h-5 w-5" />
                <span>Descargar archivo adjunto</span>
              </a>
            </div>
          )}
        </article>
      </main>

      <Footer />
    </div>
  )
}
