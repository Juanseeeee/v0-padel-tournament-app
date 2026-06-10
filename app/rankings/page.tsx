 "use client"
 
 import { useEffect, useState } from "react"
 import { useRouter, useSearchParams } from "next/navigation"
 import { Header } from "@/components/header"
 import { Footer } from "@/components/footer"
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
 import { DetailedRankingTable, type RankingFecha, type RankingJugador } from "@/components/detailed-ranking-table"
 import { Trophy } from "lucide-react"
 
 type Categoria = { id: number; nombre: string }
 
 export default function RankingsPage() {
   const router = useRouter()
   const searchParams = useSearchParams()
   const categoriaFromQuery = searchParams.get("categoria_id")
 
   const [categorias, setCategorias] = useState<Categoria[]>([])
   const [selectedCategoria, setSelectedCategoria] = useState<string>(categoriaFromQuery || "")
   const [jugadores, setJugadores] = useState<RankingJugador[]>([])
   const [fechas, setFechas] = useState<RankingFecha[]>([])
   const [puntosMap, setPuntosMap] = useState<Record<number, Record<number, { puntos: number; instancia: string }>>>({})
   const [puntosArrastre, setPuntosArrastre] = useState<Record<number, number>>({})
   const [loadingCategorias, setLoadingCategorias] = useState(true)
   const [loadingRanking, setLoadingRanking] = useState(false)
 
   useEffect(() => {
     fetch("/api/public/categorias")
       .then(r => r.json())
       .then((data: Categoria[]) => setCategorias(data || []))
       .finally(() => setLoadingCategorias(false))
   }, [])
 
   useEffect(() => {
     if ((categoriaFromQuery || "") !== selectedCategoria) {
       setSelectedCategoria(categoriaFromQuery || "")
     }
   }, [categoriaFromQuery, selectedCategoria])
 
   const handleCategoriaChange = (value: string) => {
     setSelectedCategoria(value)
     const params = new URLSearchParams(searchParams.toString())
     if (value) {
       params.set("categoria_id", value)
     } else {
       params.delete("categoria_id")
     }
     router.replace(params.toString() ? `/rankings?${params.toString()}` : "/rankings", { scroll: false })
   }
 
   useEffect(() => {
     if (!selectedCategoria) {
       setJugadores([])
       setFechas([])
       setPuntosMap({})
       setPuntosArrastre({})
       return
     }
     setLoadingRanking(true)
     fetch(`/api/portal/ranking?categoria_id=${selectedCategoria}`)
       .then(r => r.json())
       .then((data) => {
         setJugadores(data?.jugadores || [])
         setFechas(data?.fechas || [])
         setPuntosMap(data?.puntosMap || {})
         setPuntosArrastre(data?.puntosArrastre || {})
       })
       .catch(() => {
         setJugadores([])
         setFechas([])
         setPuntosMap({})
         setPuntosArrastre({})
       })
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
               Elegí una categoría para ver su ranking detallado
             </p>
           </div>
         </section>
 
         <div className="relative z-20 -mt-20 mx-auto max-w-7xl px-4 pb-20 space-y-8">
           <Card className="border-none shadow-lg bg-card/95 backdrop-blur-sm rounded-[2rem] ring-1 ring-border/50">
             <CardHeader className="pb-4 border-b border-border/10 bg-muted/20">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <CardTitle className="text-xl">Tabla de Posiciones</CardTitle>
                 <div className="min-w-[240px]">
                   <Select value={selectedCategoria} onValueChange={handleCategoriaChange} disabled={loadingCategorias}>
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
             <CardContent className="p-0 overflow-x-auto">
               {!hasSelection ? (
                 <div className="p-12 text-center text-muted-foreground">
                   Seleccioná una categoría para ver la tabla de posiciones.
                 </div>
               ) : loadingRanking ? (
                 <div className="p-8 space-y-4">
                   <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                   <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                   <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                   <div className="h-12 w-full bg-muted/30 animate-pulse rounded-lg" />
                 </div>
               ) : jugadores.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground">
                   No hay jugadores con puntos en esta categoría
                 </div>
               ) : (
                 <DetailedRankingTable
                   title={`Ranking - ${categorias.find(c => String(c.id) === selectedCategoria)?.nombre || ""}`}
                   jugadores={jugadores}
                   fechas={fechas}
                   puntosMap={puntosMap}
                   puntosArrastre={puntosArrastre}
                   getPlayerHref={(jugadorId) => `/jugador/${jugadorId}?from=public-ranking&categoria_id=${selectedCategoria}`}
                   cardClassName="shadow-none ring-0 rounded-none border-0"
                 />
               )}
             </CardContent>
           </Card>
         </div>
       </main>
       <Footer />
     </div>
   )
 }
