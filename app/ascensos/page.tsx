import { sql } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

async function getAscensos() {
  try {
    const result = await sql`
      SELECT 
        a.id, 
        a.fecha_ascenso,
        a.puntos_transferidos,
        j.id as jugador_id,
        j.nombre as jugador_nombre,
        j.apellido as jugador_apellido,
        co.nombre as categoria_origen,
        cd.nombre as categoria_destino
      FROM ascensos a
      JOIN jugadores j ON a.jugador_id = j.id
      JOIN categorias co ON a.categoria_origen_id = co.id
      JOIN categorias cd ON a.categoria_destino_id = cd.id
      ORDER BY a.fecha_ascenso DESC
    `
    return result as any[]
  } catch (e) {
    console.error("Error fetching ascensos:", e)
    return []
  }
}

export default async function AscensosPage() {
  const ascensos = await getAscensos()

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-[var(--font-display)] font-bold text-foreground flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Historial de Ascensos
            </h1>
            <p className="text-muted-foreground mt-1 ml-14">Registro oficial de todos los jugadores promovidos</p>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm ring-1 ring-border/50 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            {ascensos.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <TrendingUp className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">No hay ascensos registrados todavía</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {ascensos.map((ascenso: any) => (
                  <div key={ascenso.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-lg shrink-0 ring-1 ring-primary/20 shadow-inner">
                        {ascenso.jugador_nombre?.charAt(0)}{ascenso.jugador_apellido?.charAt(0)}
                      </div>
                      <div>
                        <Link href={`/jugador/${ascenso.jugador_id}`} className="font-[var(--font-display)] font-bold text-xl text-foreground hover:text-primary transition-colors inline-block mb-1">
                          {ascenso.jugador_nombre} {ascenso.jugador_apellido}
                        </Link>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium flex-wrap">
                          <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase tracking-wider border-dashed">
                            {ascenso.categoria_origen}
                          </Badge>
                          <TrendingUp className="h-3.5 w-3.5 text-primary drop-shadow-sm" />
                          <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-0 uppercase tracking-wider shadow-sm">
                            {ascenso.categoria_destino}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pl-16 sm:pl-0">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2.5 py-1 rounded-md border border-border/50">
                        {new Date(ascenso.fecha_ascenso).toLocaleDateString('es-AR', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      {ascenso.puntos_transferidos > 0 && (
                        <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-600 bg-yellow-500/10 font-bold tracking-wide shadow-sm">
                          +{ascenso.puntos_transferidos} pts arrastre
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}