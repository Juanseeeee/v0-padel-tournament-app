"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Calendar as MonthCalendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Trophy,
  MapPin,
  Clock,
  LogOut,
  User,
  Loader2,
  Search,
  UserPlus,
  Medal,
  TrendingUp,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PortalPage() {
  const router = useRouter();
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const { data: torneos } = useSWR("/api/portal/torneos", fetcher);
  const { data: calendarioFechas } = useSWR("/api/portal/calendario", fetcher);
  const { data: misInscripciones, mutate: mutateInscripciones } = useSWR("/api/portal/mis-inscripciones", fetcher);
  const { data: rankingData } = useSWR("/api/portal/ranking", fetcher);
  
  const [activeTab, setActiveTab] = useState<"torneos" | "calendario" | "inscripciones" | "ranking">("torneos");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | undefined>(undefined);
  const [enrollDialog, setEnrollDialog] = useState<any>(null);
  const [zonasDialog, setZonasDialog] = useState<string | null>(null);
  const { data: zonasData } = useSWR(zonasDialog ? `/api/portal/zonas/${zonasDialog}` : null, fetcher);
  const [companeroSearch, setCompaneroSearch] = useState("");
  const [companeros, setCompaneros] = useState<any[]>([]);
  const [selectedCompanero, setSelectedCompanero] = useState<any>(null);
  const [diaPreferido, setDiaPreferido] = useState("");
  const [horaDisponible, setHoraDisponible] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [searching, setSearching] = useState(false);
  const [canceling, setCanceling] = useState<number | null>(null);

  const calendarioFechasList = useMemo(() => {
    return Array.isArray(calendarioFechas) ? calendarioFechas : [];
  }, [calendarioFechas]);

  const calendarioFechasInvalid = useMemo(() => {
    return Boolean(calendarioFechas) && !Array.isArray(calendarioFechas);
  }, [calendarioFechas]);

  const calendarioMarkedDays = useMemo(() => {
    if (calendarioFechasList.length === 0) {
      return {
        programada: [] as Date[],
        en_juego: [] as Date[],
        finalizada: [] as Date[],
      };
    }

    const priority: Record<string, number> = { finalizada: 1, en_juego: 2, programada: 3 };
    const perDay = new Map<string, { date: Date; estado: string }>();

    for (const f of calendarioFechasList as any[]) {
      if (!f?.fecha_calendario) continue;
      const d = new Date(f.fecha_calendario);
      d.setHours(12, 0, 0, 0);
      const key = d.toDateString();

      const estado = String(f.estado || "programada");
      const current = perDay.get(key);
      if (!current || (priority[estado] ?? 0) > (priority[current.estado] ?? 0)) {
        perDay.set(key, { date: d, estado });
      }
    }

    const programada: Date[] = [];
    const en_juego: Date[] = [];
    const finalizada: Date[] = [];

    for (const { date, estado } of perDay.values()) {
      if (estado === "programada") programada.push(date);
      else if (estado === "en_juego") en_juego.push(date);
      else finalizada.push(date);
    }

    return { programada, en_juego, finalizada };
  }, [calendarioFechasList]);

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

  async function handleCancelEnrollment(parejaId: number) {
    if (!confirm("¿Estas seguro de que quieres darte de baja de este torneo?")) return;
    setCanceling(parejaId);
    try {
      const res = await fetch("/api/portal/cancelar-inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parejaId }),
      });
      if (res.ok) {
        mutateInscripciones();
      } else {
        const data = await res.json();
        alert(data.error || "Error al cancelar inscripcion");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setCanceling(null);
    }
  }

  if (!me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
                <div className="absolute inset-0 flex items-center justify-center rounded-full">
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {me.nombre} {me.apellido}
                </h1>
                <p className="text-sm text-muted-foreground">{me.categoria_nombre || "Sin categoria"}</p>
              </div>
            </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
          </div>

          {/* Stats Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ranking</p>
                    <p className="text-3xl font-bold text-primary">#{me.ranking || "-"}</p>
                  </div>
                  <Trophy className="h-10 w-10 text-primary/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Puntos</p>
                    <p className="text-3xl font-bold text-primary">{me.puntos_totales || 0}</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-primary/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("torneos")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "torneos"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="mr-2 inline-block h-4 w-4" />
              Torneos
            </button>
            <button
              onClick={() => setActiveTab("calendario")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "calendario"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="mr-2 inline-block h-4 w-4" />
              Calendario
            </button>
            <button
              onClick={() => setActiveTab("inscripciones")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "inscripciones"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="mr-2 inline-block h-4 w-4" />
              Mis Inscripciones
            </button>
            <button
              onClick={() => setActiveTab("ranking")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "ranking"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Medal className="mr-2 inline-block h-4 w-4" />
              Ranking
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {activeTab === "torneos" && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Torneos Disponibles</h2>
            {!torneos ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
            ) : torneos.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No hay torneos disponibles</CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {torneos.map((t: any) => {
                  const yaInscripto = misInscripciones?.some((i: any) => i.fecha_torneo_id === t.id);
                  return (
                    <Card key={t.id} className="overflow-hidden border-border/50 bg-card/60 backdrop-blur transition-all hover:border-primary/30 hover:shadow-lg">
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-start justify-between">
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                                Fecha {t.numero_fecha}
                              </Badge>
                              <Badge className={t.estado === "programada" ? "bg-green-500/20 text-green-600" : "bg-muted"}>
                                {t.estado}
                              </Badge>
                              {yaInscripto && (
                                <Badge className="bg-blue-500/20 text-blue-600 border-blue-400/40">
                                  ✓ Inscripto
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{t.categoria_nombre}</p>
                          </div>
                          <Trophy className="h-6 w-6 text-primary/60" />
                        </div>
                        <div className="space-y-2 text-sm">
                          {t.fecha_calendario && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              {new Date(t.fecha_calendario).toLocaleDateString()}
                            </div>
                          )}
                          {t.sede && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {t.sede}
                            </div>
                          )}
                          {t.hora_inicio_viernes && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              VIE {t.hora_inicio_viernes}hs | SAB {t.hora_inicio_sabado}hs
                            </div>
                          )}
                        </div>
                        {!yaInscripto ? (
                          <Button
                            className="mt-4 w-full"
                            onClick={() => setEnrollDialog(t)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Inscribirme
                          </Button>
                        ) : (
                          <div className="mt-4 p-3 rounded-md bg-primary/5 border border-primary/20 text-center text-sm text-muted-foreground">
                            Ya estás inscripto en este torneo
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "calendario" && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Calendario</h2>

            {!calendarioFechas ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">Cargando...</CardContent>
              </Card>
            ) : calendarioFechasInvalid ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No se pudo cargar el calendario
                </CardContent>
              </Card>
            ) : calendarioFechasList.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">No hay fechas cargadas</CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                <Card className="overflow-hidden border-border/50 bg-card/60 backdrop-blur">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="text-base">Calendario</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                        Hay torneo
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mx-auto w-fit">
                      <MonthCalendar
                        mode="single"
                        selected={selectedCalendarDay}
                        onSelect={setSelectedCalendarDay}
                        modifiers={{
                          hasProgramada: calendarioMarkedDays.programada,
                          hasEnJuego: calendarioMarkedDays.en_juego,
                          hasFinalizada: calendarioMarkedDays.finalizada,
                        }}
                        modifiersClassNames={{
                          hasProgramada:
                            "relative rounded-full bg-primary/20 text-primary ring-2 ring-primary/40 hover:bg-primary/25 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                          hasEnJuego:
                            "relative rounded-full bg-blue-500/15 text-blue-600 ring-2 ring-blue-500/30 hover:bg-blue-500/20 dark:text-blue-400 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-blue-500",
                          hasFinalizada:
                            "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-muted-foreground/70",
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Próximas</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {calendarioFechasList
                      .filter((f: any) => f.estado !== "finalizada")
                      .slice()
                      .sort((a: any, b: any) => new Date(a.fecha_calendario).getTime() - new Date(b.fecha_calendario).getTime())
                      .map((f: any) => (
                        <Card key={f.id} className="overflow-hidden border-border/50 bg-card/60 backdrop-blur transition-all hover:border-primary/30 hover:shadow-lg">
                          <CardContent className="p-6">
                            <div className="mb-4 flex items-start justify-between">
                              <div>
                                <div className="mb-2 flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                                    Fecha {f.numero_fecha}
                                  </Badge>
                                  <Badge className={f.estado === "en_juego" ? "bg-blue-500/20 text-blue-600" : "bg-green-500/20 text-green-600"}>
                                    {f.estado}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{f.temporada ? `Temporada ${f.temporada}` : me.categoria_nombre}</p>
                              </div>
                              <CalendarDays className="h-6 w-6 text-primary/60" />
                            </div>

                            <div className="space-y-2 text-sm">
                              {f.fecha_calendario && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <CalendarIcon className="h-4 w-4" />
                                  {new Date(f.fecha_calendario).toLocaleDateString("es-AR", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </div>
                              )}
                              {f.sede && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  {f.sede}
                                </div>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              className="mt-4 w-full bg-transparent"
                              onClick={() => router.push(`/calendario/${f.id}`)}
                            >
                              Ver detalles
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Anteriores</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {calendarioFechasList
                      .filter((f: any) => f.estado === "finalizada")
                      .slice()
                      .sort((a: any, b: any) => new Date(b.fecha_calendario).getTime() - new Date(a.fecha_calendario).getTime())
                      .map((f: any) => (
                        <Card key={f.id} className="border-border/50 bg-card/60 backdrop-blur">
                          <CardContent className="p-6">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
                                    Fecha {f.numero_fecha}
                                  </Badge>
                                  <Badge className="bg-muted text-muted-foreground">Finalizada</Badge>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {new Date(f.fecha_calendario).toLocaleDateString("es-AR", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                                {f.sede && <div className="mt-1 truncate text-sm text-muted-foreground">{f.sede}</div>}
                              </div>
                              <Button variant="secondary" onClick={() => router.push(`/calendario/${f.id}`)}>
                                Resultados
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "inscripciones" && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Mis Inscripciones</h2>
            {!misInscripciones ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
            ) : misInscripciones.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No tienes inscripciones activas</CardContent></Card>
            ) : (
              <div className="grid gap-4">
                {misInscripciones.map((i: any) => (
                  <Card key={i.id} className="border-border/50 bg-card/60 backdrop-blur">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <div className="mb-3 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                            Fecha {i.numero_fecha}
                          </Badge>
                          <Badge className={
                            i.zona_estado === "pendiente" ? "bg-yellow-500/20 text-yellow-600" :
                            i.zona_estado === "en_juego" ? "bg-blue-500/20 text-blue-600" :
                            "bg-green-500/20 text-green-600"
                          }>
                            {i.zona_estado || "Pendiente"}
                          </Badge>
                        </div>
                        <p className="mb-3 text-lg font-semibold text-foreground">
                          Pareja con: {i.companero_nombre} {i.companero_apellido}
                        </p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {i.fecha_calendario && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{new Date(i.fecha_calendario).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                          )}
                          {i.sede && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{i.sede}</span>
                            </div>
                          )}
                          {i.hora_inicio_viernes && i.hora_inicio_sabado && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>Viernes {i.hora_inicio_viernes}hs | Sábado {i.hora_inicio_sabado}hs</span>
                            </div>
                          )}
                          {i.dia_preferido && (
                            <div className="flex items-center gap-2 text-xs">
                              <span>Tu preferencia: {i.dia_preferido} {i.hora_disponible || ""}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {i.zona_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setZonasDialog(i.fecha_torneo_id)}
                          >
                            <Trophy className="mr-1 h-4 w-4" />
                            Ver Zonas
                          </Button>
                        )}
                        {(!i.zona_estado || i.zona_estado === "pendiente") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleCancelEnrollment(i.id)}
                            disabled={canceling === i.id}
                          >
                            {canceling === i.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="mr-1 h-4 w-4" />
                                Darme de baja
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ranking" && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Ranking - {me.categoria_nombre}</h2>
            {!rankingData ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
            ) : !rankingData.jugadores || rankingData.jugadores.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No hay ranking disponible</CardContent></Card>
            ) : (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="sticky left-0 z-10 bg-muted/90 backdrop-blur px-3 py-3 text-left font-semibold w-10">#</th>
                          <th className="sticky left-10 z-10 bg-muted/90 backdrop-blur px-3 py-3 text-left font-semibold min-w-[180px]">Jugador</th>
                          <th className="px-3 py-3 text-left font-semibold min-w-[100px]">Localidad</th>
                          <th className="px-3 py-3 text-center font-semibold min-w-[70px] bg-primary/10">Total</th>
                          {(rankingData.fechas || []).map((f: any) => (
                            <th key={f.id} className="px-2 py-3 text-center font-semibold min-w-[55px]">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground">F{f.numero_fecha}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rankingData.jugadores.map((j: any, idx: number) => {
                          const isMe = j.id === rankingData.mi_jugador_id;
                          return (
                            <tr
                              key={j.id}
                              className={`border-b border-border/50 transition-colors ${
                                isMe ? "bg-primary/10 font-semibold" : "hover:bg-muted/30"
                              } ${idx < 3 ? "bg-primary/5" : ""}`}
                            >
                              <td className="sticky left-0 z-10 bg-background px-3 py-2.5 font-bold text-muted-foreground">
                                {idx === 0 ? <span className="text-yellow-500">1</span> :
                                 idx === 1 ? <span className="text-slate-400">2</span> :
                                 idx === 2 ? <span className="text-amber-600">3</span> :
                                 idx + 1}
                              </td>
                              <td className="sticky left-10 z-10 bg-background px-3 py-2.5">
                                {j.nombre} {j.apellido}
                                {isMe && <Badge className="ml-2" variant="secondary">Tu</Badge>}
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">
                                {j.localidad || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-primary">
                                {j.puntos_totales}
                              </td>
                              {(rankingData.fechas || []).map((f: any) => {
                                const puntosInfo = rankingData.puntosMap?.[j.id]?.[f.id];
                                return (
                                  <td key={f.id} className="px-2 py-2.5 text-center text-xs">
                                    {puntosInfo ? (
                                      <span className="inline-block rounded px-1.5 py-0.5 font-medium bg-primary/10 text-primary">
                                        {puntosInfo.puntos}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Enroll Dialog */}
      <Dialog open={!!enrollDialog} onOpenChange={() => setEnrollDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inscribirse - Fecha {enrollDialog?.numero_fecha}</DialogTitle>
            <DialogDescription>{enrollDialog?.categoria_nombre}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Buscar companero</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Nombre o apellido..."
                  value={companeroSearch}
                  onChange={(e) => searchCompanero(e.target.value)}
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
              {companeros.length > 0 && (
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-card p-2">
                  {companeros.map((c: any) => (
                    <button
                      key={c.jugador_id}
                      onClick={() => { setSelectedCompanero(c); setCompaneros([]); setCompaneroSearch(c.nombre + " " + c.apellido); }}
                      className="w-full rounded p-2 text-left text-sm hover:bg-muted"
                    >
                      <p className="font-medium">{c.nombre} {c.apellido}</p>
                      <p className="text-xs text-muted-foreground">{c.localidad || "Sin localidad"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dia preferido</Label>
                <select
                  value={diaPreferido}
                  onChange={(e) => setDiaPreferido(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Sin preferencia</option>
                  <option value="viernes">Viernes</option>
                  <option value="sabado">Sabado</option>
                </select>
              </div>
              <div>
                <Label>Disponible desde</Label>
                <Input type="time" value={horaDisponible} onChange={(e) => setHoraDisponible(e.target.value)} />
              </div>
            </div>
            {enrollError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {enrollError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialog(null)}>Cancelar</Button>
            <Button onClick={handleEnroll} disabled={!selectedCompanero || enrolling}>
              {enrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Inscribirme
            </Button>
          </DialogFooter>
      </DialogContent>
      </Dialog>

      {/* Zonas Dialog */}
      <Dialog open={!!zonasDialog} onOpenChange={() => setZonasDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zonas del Torneo</DialogTitle>
            <DialogDescription>Información de zonas y partidos</DialogDescription>
          </DialogHeader>
          {!zonasData ? (
            <div className="p-8 text-center text-muted-foreground">Cargando zonas...</div>
          ) : zonasData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No hay zonas disponibles aún</div>
          ) : (
            <div className="grid gap-4">
              {zonasData.map((zona: any) => (
                <Card key={zona.id} className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{zona.nombre}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">{zona.dia}</Badge>
                        <Badge className={
                          zona.estado === "pendiente" ? "bg-yellow-500/20 text-yellow-600" :
                          zona.estado === "en_juego" ? "bg-blue-500/20 text-blue-600" :
                          "bg-green-500/20 text-green-600"
                        }>
                          {zona.estado}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {zona.partidos && zona.partidos.length > 0 ? (
                        zona.partidos.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                            <span className="font-medium">Partido {p.orden}</span>
                            <div className="flex-1 mx-4 text-center">
                              <span>{p.jugador1}</span>
                              <span className="mx-2 text-muted-foreground">vs</span>
                              <span>{p.jugador2}</span>
                            </div>
                            {p.ganador ? (
                              <div className="text-xs">
                                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                  Ganó: {p.ganador}
                                </Badge>
                                <div className="mt-1 text-muted-foreground">
                                  {p.set1_j1}-{p.set1_j2} | {p.set2_j1}-{p.set2_j2}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Pendiente</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center">No hay partidos registrados</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    );
  }
