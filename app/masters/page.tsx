"use client";

import Link from "next/link";
import useSWR from "swr";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LigaLogo } from "@/components/liga-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ChevronRight, CalendarDays, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MastersPage() {
  const { data, isLoading } = useSWR<{ masters: any[] }>("/api/masters", fetcher);
  const masters = data?.masters ?? [];

  // Agrupar por temporada
  const porTemporada: Record<number, any[]> = {};
  for (const m of masters) (porTemporada[m.temporada] ||= []).push(m);
  const temporadas = Object.keys(porTemporada).map(Number).sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1 relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 ring-1 ring-primary/20">
          <div className="absolute -right-8 -top-8 opacity-10"><Crown className="h-40 w-40 text-primary" /></div>
          <div className="relative flex flex-col gap-2">
            <LigaLogo size={40} tagline="Master" />
            <h1 className="mt-3 text-3xl font-[var(--font-display)] font-bold text-foreground">Masters de fin de año</h1>
            <p className="max-w-xl text-muted-foreground">
              Los <span className="font-semibold text-foreground">8 mejores del ranking</span> de cada categoría se sortean en 4 parejas
              y definen al campeón del año en una llave de eliminación directa desde semifinales.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : masters.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center flex flex-col items-center gap-3">
              <Crown className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">Todavía no hay Masters publicados. ¡Pronto!</p>
            </CardContent>
          </Card>
        ) : (
          temporadas.map((temp) => (
            <section key={temp} className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Temporada {temp}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {porTemporada[temp].map((m) => (
                  <Link key={m.id} href={`/masters/${m.id}`}>
                    <Card className="group h-full transition-all hover:shadow-xl hover:ring-1 hover:ring-primary/30">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                              <Crown className="h-6 w-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{m.categoria_nombre}</p>
                              <p className="text-xs text-muted-foreground">Master {m.temporada}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                        {(m.fecha_evento || m.dias_juego) && (
                          <div className="mt-4">
                            <Badge variant="secondary" className="text-xs">
                              {m.fecha_evento ? new Date(m.fecha_evento).toLocaleDateString("es-AR", { day: "numeric", month: "long" }) : m.dias_juego}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}
