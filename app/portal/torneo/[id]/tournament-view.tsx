'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Calendar, MapPin, ArrowLeft, Users, GitBranch, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

type PartidoZona = {
  orden: number
  jugador1: string
  jugador2: string
  ganador: string | null
  set1_j1: number | null
  set1_j2: number | null
  set2_j1: number | null
  set2_j2: number | null
}

type Zona = {
  id: number
  nombre: string
  estado: string
  partidos: PartidoZona[]
}

type Llave = {
  id: number
  ronda: string
  pareja1_jugadores: string
  pareja2_jugadores: string
  set1_pareja1: number | null
  set1_pareja2: number | null
  set2_pareja1: number | null
  set2_pareja2: number | null
  set3_pareja1: number | null
  set3_pareja2: number | null
  ganador_id: number | null
}

export function TournamentView({ 
  torneo, 
  zonas, 
  llaves 
}: { 
  torneo: any, 
  zonas: Zona[], 
  llaves: Llave[] 
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("zonas")

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden font-sans">
      <Header />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <main className="relative z-10">
        {/* Curved Hero Section */}
        <section className="relative w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-8 pb-24 text-white shadow-2xl transition-all overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl">
            <Button 
                variant="ghost" 
                className="text-white/70 hover:text-white hover:bg-white/10 mb-6 pl-0 gap-2"
                onClick={() => router.back()}
            >
                <ArrowLeft className="h-5 w-5" />
                Volver al Portal
            </Button>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {torneo.categoria_nombre}
                        </Badge>
                        <Badge variant="outline" className="text-white border-white/20">
                            {torneo.estado === 'programada' ? 'Programado' : 
                             torneo.estado === 'en_juego' ? 'En Juego' : 'Finalizado'}
                        </Badge>
                    </div>
                    <h1 className="font-[var(--font-display)] text-3xl md:text-5xl font-bold tracking-tight mb-2 text-white drop-shadow-sm">
                        Fecha {torneo.numero_fecha}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-white/80 text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-primary" />
                            {new Date(torneo.fecha_calendario).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-primary" />
                            {torneo.sede}
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </section>

        <div className="relative z-20 -mt-16 mx-auto max-w-7xl px-4 pb-20 space-y-8">
            <Tabs defaultValue="zonas" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-12 rounded-2xl bg-card/95 backdrop-blur-sm p-1 shadow-lg ring-1 ring-border/50 mb-8">
                    <TabsTrigger value="zonas" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                        <Users className="h-4 w-4 mr-2" />
                        Zonas
                    </TabsTrigger>
                    <TabsTrigger value="llaves" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                        <GitBranch className="h-4 w-4 mr-2" />
                        Llaves
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="zonas" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {zonas.length === 0 ? (
                        <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-2xl p-8 text-center">
                            <p className="text-muted-foreground">No hay zonas definidas para este torneo aún.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {zonas.map((zona) => (
                                <Card key={zona.id} className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-2xl overflow-hidden ring-1 ring-border/50">
                                    <CardHeader className="bg-muted/50 pb-4 border-b border-border/50">
                                        <CardTitle className="text-lg font-bold flex justify-between items-center">
                                            {zona.nombre}
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {zona.estado}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-border/40">
                                            {zona.partidos && zona.partidos.length > 0 ? (
                                                zona.partidos.map((partido, idx) => (
                                                    <div key={idx} className="p-4 hover:bg-muted/20 transition-colors">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                                Partido {partido.orden}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {/* Jugador 1 */}
                                                            <div className={cn(
                                                                "flex justify-between items-center p-2 rounded-lg",
                                                                partido.ganador === partido.jugador1 ? "bg-green-500/10" : ""
                                                            )}>
                                                                <span className={cn(
                                                                    "text-sm font-medium truncate flex-1",
                                                                    partido.ganador === partido.jugador1 ? "text-green-700 dark:text-green-400 font-bold" : "text-foreground"
                                                                )}>
                                                                    {partido.jugador1}
                                                                </span>
                                                                <div className="flex gap-2 ml-2 font-mono text-sm font-bold">
                                                                    <span className="w-6 text-center">{partido.set1_j1 ?? '-'}</span>
                                                                    <span className="w-6 text-center">{partido.set2_j1 ?? '-'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Jugador 2 */}
                                                            <div className={cn(
                                                                "flex justify-between items-center p-2 rounded-lg",
                                                                partido.ganador === partido.jugador2 ? "bg-green-500/10" : ""
                                                            )}>
                                                                <span className={cn(
                                                                    "text-sm font-medium truncate flex-1",
                                                                    partido.ganador === partido.jugador2 ? "text-green-700 dark:text-green-400 font-bold" : "text-foreground"
                                                                )}>
                                                                    {partido.jugador2}
                                                                </span>
                                                                <div className="flex gap-2 ml-2 font-mono text-sm font-bold">
                                                                    <span className="w-6 text-center">{partido.set1_j2 ?? '-'}</span>
                                                                    <span className="w-6 text-center">{partido.set2_j2 ?? '-'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-sm text-muted-foreground">
                                                    Partidos no generados
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="llaves" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                     {llaves.length === 0 ? (
                        <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-2xl p-8 text-center">
                            <p className="text-muted-foreground">No hay llaves generadas para este torneo aún.</p>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            {['16avos', '8vos', '4tos', 'semis', 'final'].map((ronda) => {
                                const partidosRonda = llaves.filter(l => l.ronda === ronda);
                                if (partidosRonda.length === 0) return null;

                                return (
                                    <div key={ronda}>
                                        <h3 className="text-xl font-bold mb-4 capitalize px-2 flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-primary" />
                                            {ronda === 'semis' ? 'Semifinales' : ronda === 'final' ? 'Final' : ronda}
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                                            {partidosRonda.map((partido) => (
                                                <Card key={partido.id} className="border-none shadow-md bg-card/95 backdrop-blur-sm rounded-xl overflow-hidden ring-1 ring-border/50">
                                                    <CardContent className="p-4">
                                                        <div className="space-y-3">
                                                            {/* Pareja 1 */}
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] shrink-0">
                                                                        {partido.pareja1_numero || '-'}
                                                                    </Badge>
                                                                    <span className={cn(
                                                                        "text-sm truncate",
                                                                        partido.ganador_id && partido.ganador_id === partido.pareja1_id ? "font-bold text-primary" : "text-muted-foreground"
                                                                    )}>
                                                                        {partido.pareja1_jugadores || 'A definir'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-1 font-mono text-sm font-bold shrink-0">
                                                                    <span className="w-5 text-center bg-muted rounded">{partido.set1_pareja1 ?? '-'}</span>
                                                                    <span className="w-5 text-center bg-muted rounded">{partido.set2_pareja1 ?? '-'}</span>
                                                                    <span className="w-5 text-center bg-muted rounded">{partido.set3_pareja1 ?? '-'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="h-px bg-border/50 w-full" />

                                                            {/* Pareja 2 */}
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] shrink-0">
                                                                        {partido.pareja2_numero || '-'}
                                                                    </Badge>
                                                                    <span className={cn(
                                                                        "text-sm truncate",
                                                                        partido.ganador_id && partido.ganador_id === partido.pareja2_id ? "font-bold text-primary" : "text-muted-foreground"
                                                                    )}>
                                                                        {partido.pareja2_jugadores || 'A definir'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-1 font-mono text-sm font-bold shrink-0">
                                                                    <span className="w-5 text-center bg-muted rounded">{partido.set1_pareja2 ?? '-'}</span>
                                                                    <span className="w-5 text-center bg-muted rounded">{partido.set2_pareja2 ?? '-'}</span>
                                                                    <span className="w-5 text-center bg-muted rounded">{partido.set3_pareja2 ?? '-'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
      </main>
    </div>
  )
}
