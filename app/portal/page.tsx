"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  MapPin,
  Clock,
  LogOut,
  UserPlus,
  Medal,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Users
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { parseDateOnly } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PortalTab = "torneos" | "calendario" | "inscripciones" | "ranking";

type DayPill = { day: string; month: string };

function dateToDayPill(dateString?: string | null): DayPill {
  if (!dateString) return { day: "-", month: "" };
  const date = parseDateOnly(dateString);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString("es-AR", { month: "short" }),
  };
}

function MonthCalendar({ monthStr, events }: { monthStr: string, events: any[] }) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = date.getDay(); // 0 = Sunday
  
  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
        const d = parseDateOnly(e.fecha_calendario);
        return d.getDate() === day && d.getMonth() === (month - 1) && d.getFullYear() === year;
    });
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm ring-1 ring-border/50 max-w-sm mx-auto">
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                <div key={i} className="text-[9px] font-bold text-muted-foreground">{d}</div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
                if (day === null) return <div key={idx} className="aspect-square" />;
                const dayEvents = getEventsForDay(day);
                const hasEvent = dayEvents.length > 0;
                
                let dotClass = "";
                if (hasEvent) {
                     if (dayEvents.some(e => e.estado === 'en_juego')) dotClass = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
                     else if (dayEvents.some(e => e.estado === 'programada')) dotClass = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]";
                     else dotClass = "bg-gray-400";
                }
                
                return (
                    <div key={idx} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] transition-all ${hasEvent ? 'bg-primary/5 font-bold text-foreground ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-muted/50'}`}>
                        {day}
                        {hasEvent && (
                            <div className={`mt-0.5 w-1 h-1 rounded-full ${dotClass}`} />
                        )}
                    </div>
                );
            })}
        </div>
        <div className="flex justify-center gap-3 mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                <span className="text-[9px] text-muted-foreground font-medium">En curso</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                <span className="text-[9px] text-muted-foreground font-medium">Próximo</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span className="text-[9px] text-muted-foreground font-medium">Finalizado</span>
            </div>
        </div>
    </div>
  );
}

export default function PortalPage() {
  const router = useRouter();
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const { data: categories } = useSWR("/api/public/categorias", fetcher);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<PortalTab>("torneos");
  const [page, setPage] = useState(1);
  const [calendarMonth, setCalendarMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Auto-select category logic
  useEffect(() => {
    if (!me) return;
    
    // If user is in ranking tab and has "all" selected, auto-select their main category
    if (activeTab === "ranking" && selectedCategory === "all" && me.categoria_id) {
      setSelectedCategory(String(me.categoria_id));
    }
  }, [me, activeTab, selectedCategory]);

  // Reset page when category changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  const apiCategory = selectedCategory === "all" ? "" : selectedCategory;
  const torneosUrl = `/api/portal/torneos?page=${page}&limit=10${apiCategory ? `&categoria_id=${apiCategory}` : ""}`;
  const { data: torneosData, isLoading: isLoadingTorneos } = useSWR(torneosUrl, fetcher);
  
  const calendarioUrl = `/api/portal/calendario?month=${calendarMonth}${apiCategory ? `&categoria_id=${apiCategory}` : ""}`;
  const { data: calendarioFechas, isLoading: isLoadingCalendario } = useSWR(calendarioUrl, fetcher);

  const { data: misInscripciones, isLoading: isLoadingInscripciones, mutate: mutateInscripciones } = useSWR("/api/portal/mis-inscripciones", fetcher);
  
  const rankingUrl = apiCategory ? `/api/portal/ranking?categoria_id=${apiCategory}` : null;
  const { data: rankingData, isLoading: isLoadingRanking } = useSWR(rankingUrl, fetcher);
  
  const [enrollDialog, setEnrollDialog] = useState<any>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [selectedCompanero, setSelectedCompanero] = useState<any>(null);
  const [companeroSearch, setCompaneroSearch] = useState("");
  const [companeros, setCompaneros] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [diaPreferido, setDiaPreferido] = useState("");
  const [horaDisponible, setHoraDisponible] = useState("");
  const [jugadoresCategoria, setJugadoresCategoria] = useState<any[]>([]);
  const [loadingJugadores, setLoadingJugadores] = useState(false);

  const torneosList = useMemo(() => Array.isArray(torneosData?.data) ? torneosData.data : [], [torneosData]);
  const torneosPagination = useMemo(() => torneosData?.pagination || {}, [torneosData]);
  const calendarioList = useMemo(() => Array.isArray(calendarioFechas) ? calendarioFechas : [], [calendarioFechas]);
  const inscriptoFechaIds = useMemo(() => new Set<number>((Array.isArray(misInscripciones) ? misInscripciones : []).map((i: any) => Number(i.fecha_torneo_id))), [misInscripciones]);
  const rankingList = useMemo(() => Array.isArray(rankingData?.jugadores) ? rankingData.jugadores : [], [rankingData]);
  const rankingFechas = useMemo(() => Array.isArray(rankingData?.fechas) ? rankingData.fechas : [], [rankingData]);
  const rankingPuntosMap = useMemo(() => rankingData?.puntosMap || {}, [rankingData]);
  const inscripcionesList = useMemo(() => Array.isArray(misInscripciones) ? misInscripciones : [], [misInscripciones]);

  // Determine available categories for selector
  const availableCategories = useMemo(() => {
    if (!categories) return [];
    
    // Sort so user's category is first, then by orden_nivel
    return [...categories].sort((a: any, b: any) => {
      if (me?.categoria_id) {
        if (a.id === me.categoria_id) return -1;
        if (b.id === me.categoria_id) return 1;
      }
      return (a.orden_nivel || 0) - (b.orden_nivel || 0);
    });
  }, [me, categories]);

  // Get selected category name
  const selectedCategoryName = useMemo(() => {
    if (!availableCategories || !selectedCategory) return "";
    const cat = availableCategories.find((c: any) => String(c.id) === selectedCategory);
    return cat ? cat.nombre : "";
  }, [availableCategories, selectedCategory]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const date = new Date(calendarMonth + "-01");
    date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    setCalendarMonth(date.toISOString().slice(0, 7));
  };

  const getStatusColor = (estado: string) => {
    switch(estado) {
      case 'en_juego': return 'border-green-500/50 bg-green-500/5';
      case 'programada': return 'border-blue-500/50 bg-blue-500/5';
      case 'finalizada': return 'border-gray-500/50 bg-gray-500/5';
      default: return 'border-border/50 bg-card';
    }
  };

  const getStatusBadge = (estado: string) => {
    switch(estado) {
      case 'en_juego': return <Badge className="bg-green-500 hover:bg-green-600">En Curso</Badge>;
      case 'programada': return <Badge className="bg-blue-500 hover:bg-blue-600">Próximo</Badge>;
      case 'finalizada': return <Badge variant="secondary">Finalizado</Badge>;
      default: return null;
    }
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function searchCompanero(query: string) {
    setCompaneroSearch(query);
    if (query.length < 2) { setCompaneros([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/portal/buscar-companero?q=${encodeURIComponent(query)}&categoria_id=${enrollDialog?.categoria_id}`);
      const data = await res.json();
      setCompaneros(data);
    } catch { setCompaneros([]); }
    finally { setSearching(false); }
  }
  
  if (enrollDialog && jugadoresCategoria.length === 0 && !loadingJugadores) {
    setLoadingJugadores(true);
    fetch(`/api/portal/buscar-companero?categoria_id=${enrollDialog?.categoria_id}&all=1`)
      .then(r => r.json())
      .then(data => setJugadoresCategoria(Array.isArray(data) ? data : []))
      .catch(() => setJugadoresCategoria([]))
      .finally(() => setLoadingJugadores(false));
  }

  async function handleEnroll() {
    if (!selectedCompanero || !enrollDialog) return;
    setEnrolling(true);
    setEnrollError("");
    try {
      const res = await fetch("/api/portal/inscribirse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha_torneo_id: enrollDialog.id,
          companero_id: selectedCompanero.jugador_id,
          dia_preferido: diaPreferido || null,
          hora_disponible: horaDisponible || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnrollError(data.error || "Error al inscribirse");
      } else {
        setEnrollDialog(null);
        setSelectedCompanero(null);
        setCompaneroSearch("");
        setDiaPreferido("");
        setHoraDisponible("");
        mutateInscripciones();
      }
    } catch {
      setEnrollError("Error de conexion");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUnsubscribe(inscId: number) {
    if (!confirm("¿Estás seguro que deseas darte de baja?")) return;
    
    try {
      const res = await fetch("/api/portal/cancelar-inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parejaId: inscId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al cancelar inscripción");
      } else {
        mutateInscripciones();
      }
    } catch {
      alert("Error de conexión");
    }
  }

  if (!me) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20 font-sans relative overflow-x-hidden">
      {/* Background Pattern - Subtle Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Curved Hero Section */}
      <div className="relative z-10 w-full rounded-b-[3rem] bg-gradient-to-br from-secondary to-secondary/90 px-6 pt-8 pb-28 text-white shadow-2xl transition-all overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
        
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => {}}>
                <div className="h-6 w-6 grid place-items-center">
                   <span className="text-xl font-bold">=</span>
                </div>
            </Button>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </div>

        {/* User Profile */}
        <div className="mb-8 flex flex-col justify-center animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-bold tracking-tight mb-1">Hola, {me.nombre}</h2>
            <p className="text-white/70 text-sm mb-6">¿Listo para tu próximo torneo?</p>
            
            <div className="flex items-center gap-4 bg-white/10 p-3 pr-6 rounded-2xl backdrop-blur-md w-fit border border-white/10 shadow-lg">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-inner ring-2 ring-white/20">
                    {me.nombre.charAt(0)}{me.apellido.charAt(0)}
                </div>
                <div>
                    <p className="text-sm font-bold text-white tracking-wide">{me.categoria_nombre?.toUpperCase() || "SIN CATEGORÍA"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Trophy className="h-3 w-3 text-primary" />
                        <p className="text-xs text-primary font-bold">Ranking #{me.ranking || "-"}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Floating Tabs */}
        <div className="flex justify-center w-full px-4 mt-2">
            <div className="flex items-center justify-between gap-8 bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg w-full max-w-2xl">
                {[
                    { id: "torneos", icon: CalendarIcon, label: "Torneos" },
                    { id: "calendario", icon: CalendarDays, label: "Calendario" },
                    { id: "inscripciones", icon: UserPlus, label: "Inscripciones" },
                    { id: "ranking", icon: Medal, label: "Ranking" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as PortalTab)}
                        className={`group flex flex-col items-center gap-1.5 flex-1 transition-all duration-300 outline-none focus:outline-none ${
                            activeTab === tab.id ? "opacity-100" : "opacity-60 hover:opacity-80"
                        }`}
                    >
                        <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                            activeTab === tab.id 
                            ? "bg-primary text-primary-foreground shadow-lg scale-110 ring-2 ring-primary/20" 
                            : "text-white group-hover:bg-white/10"
                        }`}>
                            <tab.icon className="h-5 w-5" />
                        </div>
                        <span className={`text-[10px] font-bold tracking-wide transition-colors ${
                            activeTab === tab.id ? "text-primary" : "text-white/60"
                        }`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Main Content Area - Overlapping */}
      <div className="relative z-20 -mt-16 px-5 space-y-6 pb-10">
        
        {/* Category Selector */}
        {(activeTab === "ranking" || activeTab === "torneos" || activeTab === "calendario") && availableCategories.length > 0 && (
          <div className="bg-card/95 backdrop-blur-sm shadow-lg rounded-2xl p-4 ring-1 ring-border/50 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-3">
               <Users className="h-4 w-4 text-muted-foreground" />
               <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                 <SelectTrigger className="w-full bg-transparent border-0 ring-0 focus:ring-0 px-0 h-auto font-bold text-foreground">
                   <SelectValue placeholder="Seleccionar categoría" />
                 </SelectTrigger>
                 <SelectContent>
                  {activeTab !== "ranking" && (
                    <SelectItem value="all">Todas las categorías</SelectItem>
                  )}
                  {availableCategories.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
               </Select>
             </div>
          </div>
        )}

        {/* Torneos View */}
        {activeTab === "torneos" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between px-2 pt-2">
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm">Próximos Torneos</h3>
                </div>

                {isLoadingTorneos ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : torneosList.length === 0 ? (
                     <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm"><CardContent className="p-8 text-center text-muted-foreground">No hay torneos disponibles</CardContent></Card>
                ) : (
                    <>
                    {torneosList.map((t: any) => {
                        const yaInscripto = inscriptoFechaIds.has(Number(t.id));
                        const pill = dateToDayPill(t.fecha_calendario);
                        const statusColor = getStatusColor(t.estado);
                        return (
                            <Card key={t.id} className={`group overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ${statusColor}`}>
                                <CardContent className="p-0">
                                    <div className="flex items-stretch min-h-[110px]">
                                        {/* Left Side - Date */}
                                        <div className="w-24 bg-primary/10 flex flex-col items-center justify-center p-4 border-r border-dashed border-primary/20 relative">
                                            <span className="text-3xl font-black text-primary leading-none">{pill.day}</span>
                                            <span className="text-[10px] font-bold uppercase text-primary/70 tracking-widest mt-1">{pill.month}</span>
                                            {/* Decorative circles for ticket effect */}
                                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-background rounded-full shadow-inner" />
                                            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-background rounded-full shadow-inner" />
                                        </div>

                                        {/* Right Side - Info */}
                                        <div className="flex-1 p-4 flex flex-col justify-center gap-3 relative">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 mr-2">
                                                    <div className="flex flex-col gap-0.5 mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-foreground text-sm line-clamp-1">Fecha {t.numero_fecha}</h4>
                                                            {getStatusBadge(t.estado)}
                                                        </div>
                                                        <span className="text-xs font-black text-primary uppercase tracking-widest">{t.categoria_nombre}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                                        <MapPin className="h-3 w-3 text-primary" /> {t.sede || "A confirmar"}
                                                    </p>
                                                </div>
                                                {yaInscripto && (
                                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0 text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0">
                                                        INSCRIPTO
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="text-[10px] text-muted-foreground font-semibold bg-muted px-2 py-1 rounded-md flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3" />
                                                    {t.hora_inicio_viernes ? `${t.hora_inicio_viernes}hs` : "TBD"}
                                                </div>
                                                
                                                {!yaInscripto ? (
                                                    <div className="flex gap-2">
                                                      <Link href={`/portal/torneo/${t.id}`}>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="h-8 rounded-xl px-3 text-xs font-bold shadow-sm"
                                                        >
                                                            Ver
                                                        </Button>
                                                      </Link>
                                                      {t.estado === 'programada' && (
                                                          <Button 
                                                              size="sm" 
                                                              className="h-8 rounded-xl px-5 text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                                                              onClick={() => setEnrollDialog(t)}
                                                          >
                                                              Inscribirse
                                                          </Button>
                                                      )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/portal/torneo/${t.id}`}>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                className="h-8 rounded-xl px-3 text-xs font-bold shadow-sm"
                                                            >
                                                                Ver
                                                            </Button>
                                                        </Link>
                                                        <div className="h-8 w-8 rounded-full bg-green-500/20 grid place-items-center animate-in zoom-in">
                                                            <span className="text-green-600 text-sm font-bold">✓</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    
                    {/* Pagination Controls */}
                    {torneosPagination.total > 10 && (
                        <div className="flex justify-center items-center gap-4 mt-4 pb-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="rounded-full w-8 h-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground font-medium">
                                Página {page} de {Math.ceil(torneosPagination.total / torneosPagination.limit)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= Math.ceil(torneosPagination.total / torneosPagination.limit)}
                                className="rounded-full w-8 h-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    </>
                )}
            </div>
        )}

        {/* Calendario View */}
        {activeTab === "calendario" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between px-2 pt-2 bg-card/50 p-3 rounded-2xl backdrop-blur-sm">
                    <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm capitalize">
                        {new Date(calendarMonth + "-01").toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                <MonthCalendar monthStr={calendarMonth} events={calendarioList} />

                {isLoadingCalendario ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (!calendarioFechas || calendarioFechas.length === 0) ? (
                    <Card className="border-none shadow-sm bg-card rounded-2xl p-8 text-center text-muted-foreground">
                        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>No hay fechas programadas para este mes</p>
                    </Card>
                ) : (
                    calendarioFechas.map((fecha: any, i: number) => {
                         const statusColor = getStatusColor(fecha.estado);
                         return (
                             <Card key={i} className={`border-none shadow-sm rounded-2xl overflow-hidden hover:bg-accent/5 transition-colors ring-1 ${statusColor}`}>
                                <div className="flex items-center p-4 gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary font-bold shrink-0">
                                        <span className="text-lg leading-none">{parseDateOnly(fecha.fecha_calendario).getDate()}</span>
                                        <span className="text-[10px] uppercase">{parseDateOnly(fecha.fecha_calendario).toLocaleDateString('es-AR', {month: 'short'})}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col gap-0.5 mb-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm">Fecha {fecha.numero_fecha}</h4>
                                                {getStatusBadge(fecha.estado)}
                                            </div>
                                            <span className="text-xs font-black text-primary uppercase tracking-widest">{fecha.categoria_nombre}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{fecha.sede || "Sede por definir"}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                            </Card>
                        );
                    })
                )}
             </div>
        )}

        {/* Inscripciones View */}
         {activeTab === "inscripciones" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between px-2 pt-2">
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm">Mis Inscripciones</h3>
                </div>
                {isLoadingInscripciones ? (
                     <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : inscripcionesList.length === 0 ? (
                     <Card className="border-none shadow-sm bg-card rounded-2xl p-8 text-center text-muted-foreground">
                         <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-20" />
                         <p>No estás inscripto en ningún torneo</p>
                         <Button variant="link" onClick={() => setActiveTab("torneos")} className="mt-2 text-primary">Ir a Torneos</Button>
                     </Card>
                ) : (
                    inscripcionesList.map((insc: any) => (
                        <Card key={insc.id} className="border-none shadow-sm bg-card rounded-2xl overflow-hidden relative">
                             <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                             <div className="p-4 pl-6">
                                <div className="flex justify-between items-center mb-2">
                                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-600 bg-green-500/5">CONFIRMADO</Badge>
                                    <span className="text-xs text-muted-foreground font-mono">{new Date(insc.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-foreground">Fecha {insc.numero_fecha}</h4>
                                <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted/50">
                                    <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center text-xs font-bold text-primary">
                                        {insc.companero_nombre?.charAt(0) || "?"}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Compañero</p>
                                        <p className="text-xs font-semibold">{insc.companero_nombre} {insc.companero_apellido}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Link href={`/portal/torneo/${insc.fecha_torneo_id}`} className="flex-1">
                                        <Button size="sm" variant="outline" className="w-full text-xs h-8">
                                            <Trophy className="mr-1.5 h-3 w-3" />
                                            Ver Torneo
                                        </Button>
                                    </Link>
                                    {insc.estado === 'programada' && (
                                        <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            className="flex-1 text-xs h-8"
                                            onClick={() => handleUnsubscribe(insc.id)}
                                        >
                                            <LogOut className="mr-1.5 h-3 w-3" />
                                            Darse de baja
                                        </Button>
                                    )}
                                </div>
                             </div>
                        </Card>
                    ))
                )}
             </div>
        )}

        {/* Ranking View */}
         {activeTab === "ranking" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                 <div className="flex items-center justify-between px-2 pt-2">
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm">Ranking {selectedCategoryName || me.categoria_nombre}</h3>
                </div>
                 <Card className="border-none shadow-sm bg-card rounded-3xl overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto">
                        {isLoadingRanking ? (
                             <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : rankingList.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">Ranking no disponible</div>
                        ) : (
                            <TooltipProvider delayDuration={0}>
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-b border-border/40">
                                    <TableHead className="w-12 text-center font-bold text-muted-foreground">#</TableHead>
                                    <TableHead className="min-w-[200px] font-bold text-muted-foreground">Jugador</TableHead>
                                    {rankingFechas.map((fecha: any) => (
                                      <TableHead key={fecha.id} className="text-center min-w-[80px]">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="cursor-help flex flex-col items-center">
                                              <span className="font-bold text-primary">Fecha {fecha.numero_fecha}</span>
                                              <span className="text-[10px] font-normal text-muted-foreground hidden sm:block">
                                                {new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                              </span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="text-center p-2">
                                            <p className="font-bold">Fecha {fecha.numero_fecha}</p>
                                            <p className="text-xs">{new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{fecha.sede}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TableHead>
                                    ))}
                                    <TableHead className="text-right font-bold text-primary w-24">TOTAL</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rankingList.map((player: any, index: number) => (
                                    <TableRow key={player.id} className={`hover:bg-muted/30 border-b border-border/40 transition-colors ${player.id === me.id ? "bg-primary/5" : ""}`}>
                                      <TableCell className="text-center font-medium">
                                        <div className={`
                                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mx-auto
                                          ${index === 0 ? "bg-yellow-100 text-yellow-700" : 
                                            index === 1 ? "bg-gray-100 text-gray-700" : 
                                            index === 2 ? "bg-orange-100 text-orange-700" : 
                                            "text-muted-foreground"}
                                        `}>
                                          {index + 1}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-col">
                                          <span className={`font-bold ${player.id === me.id ? "text-primary" : "text-foreground"}`}>
                                            {player.nombre} {player.apellido} {player.id === me.id && "(Tú)"}
                                          </span>
                                          {player.localidad && (
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{player.localidad}</span>
                                          )}
                                        </div>
                                      </TableCell>
                                      {rankingFechas.map((fecha: any) => {
                                        const puntosData = rankingPuntosMap[player.id]?.[fecha.id];
                                        return (
                                          <TableCell key={fecha.id} className="text-center p-2">
                                            {puntosData ? (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div className="inline-flex flex-col items-center cursor-help">
                                                    <span className="font-bold text-foreground">{puntosData.puntos}</span>
                                                    {puntosData.instancia && (
                                                      <span className="text-[9px] text-muted-foreground uppercase max-w-[60px] truncate">
                                                        {puntosData.instancia === 'campeon' ? '🏆' : 
                                                         puntosData.instancia === 'finalista' ? '🥈' : 
                                                         puntosData.instancia.substring(0, 3)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="font-bold">{puntosData.puntos} Puntos</p>
                                                  <p className="text-xs capitalize">{puntosData.instancia?.replace('_', ' ') || 'Participación'}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            ) : (
                                              <span className="text-muted-foreground/30 text-xl">-</span>
                                            )}
                                          </TableCell>
                                        )
                                      })}
                                      <TableCell className="text-right">
                                        <span className="font-black text-lg text-primary">{player.puntos_totales}</span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TooltipProvider>
                        )}
                    </CardContent>
                 </Card>
             </div>
        )}

      </div>

      {/* Enroll Dialog */}
      <Dialog open={!!enrollDialog} onOpenChange={(open) => !open && setEnrollDialog(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl bg-card">
          <DialogHeader className="space-y-3 pb-4 border-b border-border/40">
            <DialogTitle className="text-xl font-bold text-center flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <UserPlus className="h-6 w-6" />
                </div>
                Inscripción al Torneo
            </DialogTitle>
            <DialogDescription className="text-center font-medium text-foreground/80">
              Fecha {enrollDialog?.numero_fecha} • {enrollDialog?.sede}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-5 py-4">
             <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Buscar Compañero</label>
                <div className="relative">
                    <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input 
                        className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                        placeholder="Nombre del jugador..."
                        value={companeroSearch}
                        onChange={(e) => searchCompanero(e.target.value)}
                    />
                </div>
                {companeros.length > 0 && (
                    <div className="border rounded-xl mt-2 p-2 max-h-40 overflow-y-auto bg-muted/30 shadow-inner custom-scrollbar">
                        {companeros.map(c => (
                            <div 
                                key={c.id} 
                                className="p-3 hover:bg-primary/10 cursor-pointer rounded-lg text-sm flex justify-between items-center transition-colors"
                                onClick={() => { setSelectedCompanero(c); setCompaneros([]); setCompaneroSearch(`${c.nombre} ${c.apellido}`); }}
                            >
                                <span className="font-semibold">{c.nombre} {c.apellido}</span>
                                <Badge variant="secondary" className="text-[10px] h-5">Select</Badge>
                            </div>
                        ))}
                    </div>
                )}
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Jugadores de tu categoría</label>
               <div className="border rounded-xl p-2 max-h-40 overflow-y-auto bg-muted/30 shadow-inner custom-scrollbar">
                 {loadingJugadores ? (
                   <div className="text-xs text-muted-foreground p-2">Cargando...</div>
                 ) : (jugadoresCategoria.length === 0 ? (
                   <div className="text-xs text-muted-foreground p-2">No hay jugadores</div>
                 ) : (
                   jugadoresCategoria.map(c => (
                     <div
                       key={c.jugador_id}
                       className="p-3 hover:bg-primary/10 cursor-pointer rounded-lg text-sm flex justify-between items-center transition-colors"
                       onClick={() => { setSelectedCompanero(c); setCompaneros([]); setCompaneroSearch(`${c.nombre} ${c.apellido}`); }}
                     >
                       <span className="font-semibold">{c.nombre} {c.apellido}</span>
                       <Badge variant="secondary" className="text-[10px] h-5">Select</Badge>
                     </div>
                   ))
                 ))}
               </div>
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Preferencia de horario (opcional)</label>
               <div className="grid grid-cols-2 gap-3">
                 <select
                   className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   value={diaPreferido}
                   onChange={(e) => setDiaPreferido(e.target.value)}
                 >
                   <option value="">Seleccionar día</option>
                   <option value="viernes">Viernes</option>
                   <option value="sabado">Sábado</option>
                   <option value="domingo">Domingo</option>
                 </select>
                 <input
                   type="time"
                   className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   value={horaDisponible}
                   onChange={(e) => setHoraDisponible(e.target.value)}
                 />
               </div>
             </div>
          </div>

          <DialogFooter>
            <Button className="w-full rounded-xl h-12 text-sm font-bold shadow-lg shadow-primary/20" onClick={handleEnroll} disabled={enrolling || !selectedCompanero}>
                {enrolling ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                    </>
                ) : (
                    "Confirmar Inscripción"
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
