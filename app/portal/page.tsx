"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
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
  Trophy,
  Users
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PortalTab = "torneos" | "calendario" | "inscripciones" | "ranking";

type DayPill = { day: string; month: string };

function dateToDayPill(dateString?: string | null): DayPill {
  if (!dateString) return { day: "-", month: "" };
  const date = new Date(dateString);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString("es-AR", { month: "short" }),
  };
}

export default function PortalPage() {
  const router = useRouter();
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const { data: torneos } = useSWR("/api/portal/torneos", fetcher);
  const { data: calendarioFechas } = useSWR("/api/portal/calendario", fetcher);
  const { data: misInscripciones, mutate: mutateInscripciones } = useSWR("/api/portal/mis-inscripciones", fetcher);
  const { data: rankingData } = useSWR("/api/portal/ranking", fetcher);
  
  const [activeTab, setActiveTab] = useState<PortalTab>("torneos");
  const [enrollDialog, setEnrollDialog] = useState<any>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [selectedCompanero, setSelectedCompanero] = useState<any>(null);
  const [companeroSearch, setCompaneroSearch] = useState("");
  const [companeros, setCompaneros] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [diaPreferido, setDiaPreferido] = useState("");
  const [horaDisponible, setHoraDisponible] = useState("");

  const torneosList = useMemo(() => Array.isArray(torneos) ? torneos : [], [torneos]);
  const inscriptoFechaIds = useMemo(() => new Set<number>((Array.isArray(misInscripciones) ? misInscripciones : []).map((i: any) => Number(i.fecha_torneo_id))), [misInscripciones]);
  const rankingList = useMemo(() => Array.isArray(rankingData) ? rankingData : [], [rankingData]);
  const inscripcionesList = useMemo(() => Array.isArray(misInscripciones) ? misInscripciones : [], [misInscripciones]);

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
        
        {/* Torneos View */}
        {activeTab === "torneos" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between px-2 pt-2">
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm">Próximos Torneos</h3>
                    <Button variant="link" className="text-xs text-muted-foreground font-medium h-auto p-0">Ver todos</Button>
                </div>

                {torneosList.length === 0 ? (
                     <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm"><CardContent className="p-8 text-center text-muted-foreground">No hay torneos disponibles</CardContent></Card>
                ) : (
                    torneosList.map((t: any) => {
                        const yaInscripto = inscriptoFechaIds.has(Number(t.id));
                        const pill = dateToDayPill(t.fecha_calendario);
                        return (
                            <Card key={t.id} className="group overflow-hidden border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-card rounded-[1.5rem] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-border/50">
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
                                                <div>
                                                    <h4 className="font-bold text-foreground text-sm line-clamp-1">Fecha {t.numero_fecha}</h4>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                                                        <MapPin className="h-3 w-3 text-primary" /> {t.sede || "A confirmar"}
                                                    </p>
                                                </div>
                                                {yaInscripto && (
                                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
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
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 rounded-xl px-5 text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                                                        onClick={() => setEnrollDialog(t)}
                                                    >
                                                        Inscribirse
                                                    </Button>
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-green-500/20 grid place-items-center animate-in zoom-in">
                                                        <span className="text-green-600 text-sm font-bold">✓</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        )}

        {/* Calendario View */}
        {activeTab === "calendario" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between px-2 pt-2">
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm">Calendario de Partidos</h3>
                </div>
                {(!calendarioFechas || calendarioFechas.length === 0) ? (
                    <Card className="border-none shadow-sm bg-card rounded-2xl p-8 text-center text-muted-foreground">
                        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>No hay fechas programadas</p>
                    </Card>
                ) : (
                    calendarioFechas.map((fecha: any, i: number) => (
                         <Card key={i} className="border-none shadow-sm bg-card rounded-2xl overflow-hidden hover:bg-accent/5 transition-colors">
                            <div className="flex items-center p-4 gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary font-bold shrink-0">
                                    <span className="text-lg leading-none">{new Date(fecha.fecha_calendario).getDate()}</span>
                                    <span className="text-[10px] uppercase">{new Date(fecha.fecha_calendario).toLocaleDateString('es-AR', {month: 'short'})}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm">Fecha {fecha.numero_fecha}</h4>
                                    <p className="text-xs text-muted-foreground">{fecha.sede || "Sede por definir"}</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                        </Card>
                    ))
                )}
             </div>
        )}

        {/* Inscripciones View */}
         {activeTab === "inscripciones" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between px-2 pt-2">
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm">Mis Inscripciones</h3>
                </div>
                {inscripcionesList.length === 0 ? (
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
                    <h3 className="text-lg font-bold text-foreground drop-shadow-sm">Ranking {me.categoria_nombre}</h3>
                </div>
                 <Card className="border-none shadow-sm bg-card rounded-3xl overflow-hidden">
                    <div className="p-0">
                        {rankingList.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">Ranking no disponible</div>
                        ) : (
                            <div className="divide-y divide-border/40">
                                {rankingList.map((player: any, index: number) => (
                                    <div key={player.id} className={`flex items-center p-4 ${player.id === me.id ? "bg-primary/5" : ""}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mr-4 ${
                                            index === 0 ? "bg-yellow-400 text-yellow-900 shadow-yellow-400/50 shadow-md" : 
                                            index === 1 ? "bg-gray-300 text-gray-800" : 
                                            index === 2 ? "bg-amber-700 text-amber-100" : "bg-muted text-muted-foreground"
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold ${player.id === me.id ? "text-primary" : "text-foreground"}`}>
                                                {player.nombre} {player.apellido} {player.id === me.id && "(Tú)"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">{player.partidos_jugados || 0} Partidos jugados</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-black text-primary">{player.puntos || 0}</span>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Puntos</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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