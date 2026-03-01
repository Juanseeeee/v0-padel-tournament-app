 "use client"
 
 import { useEffect, useState } from "react"
 import { Header } from "@/components/header"
 import { Footer } from "@/components/footer"
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
 import { Badge } from "@/components/ui/badge"
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
 import { Trophy, TrendingUp } from "lucide-react"
 
 type Categoria = { id: number; nombre: string }
 type JugadorRanking = {
   id: number
   nombre: string
   apellido: string
   localidad: string | null
   puntos_totales: number
   torneos_jugados?: number
 }
 
 export default function RankingsPage() {
   const [categorias, setCategorias] = useState<Categoria[]>([])
   const [selectedCategoria, setSelectedCategoria] = useState<string>("")
   const [jugadores, setJugadores] = useState<JugadorRanking[]>([])
   const [loadingCategorias, setLoadingCategorias] = useState(true)
   const [loadingRanking, setLoadingRanking] = useState(false)
 
   useEffect(() => {
     fetch("/api/public/categorias")
       .then(r => r.json())
       .then((data: Categoria[]) => setCategorias(data || []))
       .finally(() => setLoadingCategorias(false))
   }, [])
 
   useEffect(() => {
     if (!selectedCategoria) {
       setJugadores([])
       return
     }
     setLoadingRanking(true)
     fetch(`/api/portal/ranking?categoria_id=${selectedCategoria}`)
       .then(r => r.json())
       .then((data) => setJugadores(data?.jugadores || []))
       .catch(() => setJugadores([]))
       .finally(() => setLoadingRanking(false))
   }, [selectedCategoria])
 
   const hasSelection = selectedCategoria !== ""
 
   return (
     <div className="min-h-screen bg-background relative overflow-x-hidden font-sans">
       <Header />
       <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
 
       <main className="relative z-10">
         <section className="relative w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-12 pb-32 text-white shadow-2xl transition-all overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
           <div className="relative z-10 mx-auto max-w-7xl text-center">
             <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-6 ring-1 ring-white/20 shadow-lg">
               <Trophy className="h-8 w-8 text-primary" />
             </div>
             <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-white drop-shadow-sm">
               RANKINGS
             </h1>
             <p className="text-white/80 text-lg max-w-2xl mx-auto font-medium">
               Elegí una categoría para ver su ranking
             </p>
           </div>
         </section>
 
         <div className="relative z-20 -mt-20 mx-auto max-w-5xl px-4 pb-20 space-y-8">
           <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-[2rem] ring-1 ring-border/50">
             <CardHeader className="pb-4 border-b border-border/10 bg-muted/20">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <CardTitle className="text-xl">Seleccionar categoría</CardTitle>
                 <div className="min-w-[240px]">
                   <Select value={selectedCategoria} onValueChange={setSelectedCategoria} disabled={loadingCategorias}>
                     <SelectTrigger className="rounded-xl">
                       <SelectValue placeholder={loadingCategorias ? "Cargando categorías..." : "Elegí una categoría"} />
                     </SelectTrigger>
                     <SelectContent>
                       {categorias.map(c => (
                         <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               </div>
             </CardHeader>
             <CardContent className="p-0">
               {!hasSelection ? (
                 <div className="p-12 text-center text-muted-foreground">
                   Seleccioná una categoría para ver la tabla de posiciones.
                 </div>
               ) : loadingRanking ? (
                 <div className="p-8">
                   <div className="h-24 rounded-xl bg-muted/30 animate-pulse mb-3" />
                   <div className="h-24 rounded-xl bg-muted/30 animate-pulse mb-3" />
                   <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
                 </div>
               ) : jugadores.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground">
                   No hay jugadores con puntos en esta categoría
                 </div>
               ) : (
                 <div className="divide-y divide-border/40">
                   {jugadores.map((j, idx) => (
                     <div key={j.id} className="flex items-center p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                       <div className={`
                         w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-sm sm:text-base mr-4 sm:mr-6 shrink-0 shadow-sm
                         ${idx === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 ring-4 ring-yellow-500/20" : 
                           idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 ring-4 ring-gray-400/20" : 
                           idx === 2 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900 ring-4 ring-orange-500/20" : 
                           "bg-muted text-muted-foreground font-bold"}
                       `}>
                         {idx + 1}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                           <h3 className="font-bold text-base sm:text-lg text-foreground truncate">
                             {j.nombre} {j.apellido}
                           </h3>
                           {j.localidad && (
                             <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                               {j.localidad}
                             </Badge>
                           )}
                         </div>
                         <div className="flex items-center gap-4 mt-1">
                           <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                             <TrendingUp className="h-3 w-3" /> {j.torneos_jugados || 0} Torneos
                           </p>
                         </div>
                       </div>
                       <div className="text-right pl-4">
                         <span className="block text-2xl sm:text-3xl font-black text-primary leading-none tracking-tight">
                           {j.puntos_totales || 0}
                         </span>
                         <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Puntos</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </Card>
         </div>
       </main>
       <Footer />
     </div>
   )
 }
