"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { AdminWrapper } from "@/components/admin-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Crown, Shuffle, Loader2, Eye, EyeOff, Repeat, CalendarDays, Clock,
  MapPin, Save, ExternalLink, CheckCircle2, Trophy, ListOrdered, Star,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const RONDA_LABEL: Record<string, string> = { semis: "Semifinales", final: "Final" };

export default function AdminMasterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, mutate, isLoading } = useSWR<any>(`/api/admin/masters/${id}`, fetcher);

  const master = data?.master;
  const participantes: any[] = data?.participantes ?? [];
  const llaves: any[] = data?.llaves ?? [];
  const rankingCategoria: any[] = data?.ranking_categoria ?? [];

  // pareja_numero -> [jugadores]
  const parejas = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const p of participantes) {
      if (p.pareja_numero == null) continue;
      (map[p.pareja_numero] ||= []).push(p);
    }
    return map;
  }, [participantes]);

  const parejaLabel = (numero: number | null) => {
    if (numero == null) return null;
    const js = parejas[numero];
    if (!js || js.length === 0) return `Pareja ${numero}`;
    return js.map((j) => `${j.apellido} ${j.nombre?.charAt(0)}.`).join(" / ");
  };

  if (isLoading || !master) {
    return (
      <AdminWrapper title="Master">
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminWrapper>
    );
  }

  const yaSorteado = llaves.length > 0;

  return (
    <AdminWrapper
      title={master.categoria_nombre}
      description={`Master ${master.temporada}`}
      headerActions={
        master.publicado && (
          <Link href={`/masters/${master.id}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="h-4 w-4" /> Ver público</Button>
          </Link>
        )
      }
    >
      <div className="space-y-6">
        <ConfigCard master={master} onSaved={mutate} />
        <div className="grid gap-6 lg:grid-cols-2">
          <RankingCategoriaCard ranking={rankingCategoria} />
          <ClasificadosCard
            masterId={master.id}
            participantes={participantes}
            yaSorteado={yaSorteado}
            onChanged={mutate}
          />
        </div>
        {yaSorteado && (
          <BracketEditor masterId={master.id} llaves={llaves} parejaLabel={parejaLabel} onSaved={mutate} />
        )}
      </div>
    </AdminWrapper>
  );
}

/* ---------- Ranking completo de la categoría (izquierda) ---------- */
function RankingCategoriaCard({ ranking }: { ranking: any[] }) {
  const clasificados = ranking.filter((r) => r.clasificado).length;
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base"><ListOrdered className="h-4 w-4 text-primary" /> Ranking de la categoría</CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Clasificado ({clasificados})</span>
          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> Recomendado (reemplazo)</span>
        </div>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Sin jugadores en la categoría.</p>
        ) : (
          <div className="max-h-[520px] overflow-y-auto space-y-1 pr-1">
            {ranking.map((p, i) => {
              const bg = p.clasificado
                ? "bg-green-500/10 border-green-500/30"
                : p.recomendado
                ? "bg-amber-500/5 border-amber-500/30"
                : "border-transparent";
              return (
                <div key={p.id} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 ${bg}`}>
                  <span className={`w-6 text-center text-sm font-bold ${p.clasificado ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      {p.clasificado && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0" />}
                      {p.recomendado && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      {p.nombre} {p.apellido}
                      {p.es_reemplazo && <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-600">reemplazo</Badge>}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">{p.puntos} pts</span>
                      <span>· {p.fechas_jugadas} de {p.fechas_totales} fechas</span>
                      {p.recomendado && p.jugo_2_de_ultimas_3 && <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600">2 de últimas 3</Badge>}
                      {p.recomendado && p.jugo_60pct && <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600">≥60%</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Config (días, horarios, publicar) ---------- */
function ConfigCard({ master, onSaved }: { master: any; onSaved: () => void }) {
  const [fecha, setFecha] = useState(master.fecha_evento?.slice(0, 10) ?? "");
  const [dias, setDias] = useState(master.dias_juego ?? "");
  const [hora, setHora] = useState(master.hora_inicio ?? "");
  const [saving, setSaving] = useState(false);

  async function save(extra: Record<string, any> = {}) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/masters/${master.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha_evento: fecha || null,
          dias_juego: dias || null,
          hora_inicio: hora || null,
          ...extra,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast({ title: "Guardado" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" /> Días y horarios</CardTitle>
        <Button
          variant={master.publicado ? "outline" : "default"}
          size="sm"
          className="gap-2"
          disabled={saving}
          onClick={() => save({ publicado: !master.publicado })}
        >
          {master.publicado ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label className="text-xs flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Fecha del evento</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Días de juego</Label>
          <Input placeholder="ej. sábado, domingo" value={dias} onChange={(e) => setDias(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Hora de inicio</Label>
          <Input placeholder="ej. 14:00" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <Button onClick={() => save()} disabled={saving} size="sm" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Clasificados + sorteo + reemplazos ---------- */
function ClasificadosCard({
  masterId, participantes, yaSorteado, onChanged,
}: { masterId: number; participantes: any[]; yaSorteado: boolean; onChanged: () => void }) {
  const [sorteando, setSorteando] = useState(false);
  const [reemplazar, setReemplazar] = useState<any | null>(null);

  async function sortear() {
    setSorteando(true);
    try {
      const res = await fetch(`/api/admin/masters/${masterId}/sortear`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast({ title: "Sorteo realizado", description: "Se armaron las parejas y la llave." });
      onChanged();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSorteando(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Crown className="h-4 w-4 text-primary" /> Clasificados ({participantes.length})</CardTitle>
        <Button onClick={sortear} disabled={sorteando || participantes.length < 2} className="gap-2">
          {sorteando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
          {yaSorteado ? "Re-sortear parejas" : "Sortear parejas"}
        </Button>
      </CardHeader>
      <CardContent>
        {participantes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No hay clasificados. Verificá que la categoría tenga jugadores con puntos.</p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {participantes.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{p.seed}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {p.nombre} {p.apellido}
                    {p.es_reemplazo && <Badge variant="secondary" className="ml-2 text-[10px] bg-amber-500/15 text-amber-600">reemplazo</Badge>}
                    {p.pareja_numero && <Badge variant="outline" className="ml-2 text-[10px]">Pareja {p.pareja_numero}</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.puntos} pts · {p.fechas_jugadas ?? 0} {(p.fechas_jugadas ?? 0) === 1 ? "fecha" : "fechas"}
                    {p.localidad ? ` · ${p.localidad}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setReemplazar(p)}>
                  <Repeat className="h-3.5 w-3.5" /> Reemplazar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {reemplazar && (
        <ReemplazarDialog
          masterId={masterId}
          sale={reemplazar}
          onClose={() => setReemplazar(null)}
          onDone={() => { setReemplazar(null); onChanged(); }}
        />
      )}
    </Card>
  );
}

function ReemplazarDialog({ masterId, sale, onClose, onDone }: { masterId: number; sale: any; onClose: () => void; onDone: () => void }) {
  const { data, isLoading } = useSWR<any>(`/api/admin/masters/${masterId}/candidatos`, fetcher);
  const [saving, setSaving] = useState<number | null>(null);
  const candidatos: any[] = data?.candidatos ?? [];

  async function elegir(entra: any) {
    setSaving(entra.id);
    try {
      const res = await fetch(`/api/admin/masters/${masterId}/reemplazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sale_jugador_id: sale.jugador_id, entra_jugador_id: entra.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      toast({
        title: "Reemplazo aplicado",
        description: json.necesita_resorteo ? "Ojo: ya estaba sorteado, conviene re-sortear." : undefined,
      });
      onDone();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setSaving(null);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reemplazar a {sale.nombre} {sale.apellido}</DialogTitle>
          <DialogDescription>Candidatos ordenados por aptitud (puntos, actividad reciente y participación).</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto space-y-1.5 pr-1">
            {candidatos.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay candidatos disponibles.</p>}
            {candidatos.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.nombre} {c.apellido}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">{c.puntos} pts</Badge>
                    {c.jugo_2_de_ultimas_3 && <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600">2 de últimas 3</Badge>}
                    {c.jugo_60pct && <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600">{c.porcentaje_fechas}% fechas</Badge>}
                    {!c.jugo_60pct && <span className="text-[10px] text-muted-foreground">{c.porcentaje_fechas}% fechas</span>}
                  </div>
                </div>
                <Button size="sm" disabled={saving !== null} onClick={() => elegir(c)}>
                  {saving === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Elegir"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Editor del bracket ---------- */
function BracketEditor({
  masterId, llaves, parejaLabel, onSaved,
}: { masterId: number; llaves: any[]; parejaLabel: (n: number | null) => string | null; onSaved: () => void }) {
  const rondas = ["semis", "final"];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" /> Llave del Master</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {rondas.map((ronda) => {
            const matches = llaves.filter((l) => l.ronda === ronda);
            if (matches.length === 0) return null;
            return (
              <div key={ronda} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{RONDA_LABEL[ronda]}</h3>
                {matches.map((m) => (
                  <MatchCard key={m.id} masterId={masterId} match={m} parejaLabel={parejaLabel} onSaved={onSaved} />
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchCard({ masterId, match, parejaLabel, onSaved }: { masterId: number; match: any; parejaLabel: (n: number | null) => string | null; onSaved: () => void }) {
  const [sets, setSets] = useState({
    set1_e1: match.set1_e1 ?? "", set1_e2: match.set1_e2 ?? "",
    set2_e1: match.set2_e1 ?? "", set2_e2: match.set2_e2 ?? "",
    set3_e1: match.set3_e1 ?? "", set3_e2: match.set3_e2 ?? "",
  });
  const [horario, setHorario] = useState(match.fecha_hora_programada ?? "");
  const [cancha, setCancha] = useState(match.cancha_numero ?? "");
  const [orden, setOrden] = useState(match.orden ?? match.posicion ?? "");
  const [saving, setSaving] = useState(false);

  const label1 = parejaLabel(match.equipo1_numero) ?? "A definir";
  const label2 = parejaLabel(match.equipo2_numero) ?? "A definir";
  const gan1 = match.ganador_numero != null && match.ganador_numero === match.equipo1_numero;
  const gan2 = match.ganador_numero != null && match.ganador_numero === match.equipo2_numero;

  async function save() {
    setSaving(true);
    try {
      const num = (v: any) => (v === "" || v == null ? null : Number(v));
      const res = await fetch(`/api/admin/masters/${masterId}/llaves/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          set1_e1: num(sets.set1_e1), set1_e2: num(sets.set1_e2),
          set2_e1: num(sets.set2_e1), set2_e2: num(sets.set2_e2),
          set3_e1: num(sets.set3_e1), set3_e2: num(sets.set3_e2),
          fecha_hora_programada: horario || null,
          cancha_numero: num(cancha),
          orden: num(orden),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast({ title: "Partido guardado" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const setInput = (key: keyof typeof sets) => (
    <Input
      type="number" min={0} max={9}
      value={(sets as any)[key]}
      onChange={(e) => setSets((s) => ({ ...s, [key]: e.target.value }))}
      className="w-9 h-8 px-1 text-center"
    />
  );

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {/* Equipo 1 */}
      <div className={`flex items-center justify-between gap-2 ${gan1 ? "font-bold text-primary" : ""}`}>
        <span className="text-sm truncate flex items-center gap-1">{gan1 && <CheckCircle2 className="h-3.5 w-3.5" />}{label1}</span>
        <div className="flex gap-1">{setInput("set1_e1")}{setInput("set2_e1")}{setInput("set3_e1")}</div>
      </div>
      {/* Equipo 2 */}
      <div className={`flex items-center justify-between gap-2 ${gan2 ? "font-bold text-primary" : ""}`}>
        <span className="text-sm truncate flex items-center gap-1">{gan2 && <CheckCircle2 className="h-3.5 w-3.5" />}{label2}</span>
        <div className="flex gap-1">{setInput("set1_e2")}{setInput("set2_e2")}{setInput("set3_e2")}</div>
      </div>
      {/* Horario / cancha / orden */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <div className="col-span-3 flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input type="datetime-local" value={horario} onChange={(e) => setHorario(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input type="number" placeholder="Cancha" value={cancha} onChange={(e) => setCancha(e.target.value)} className="h-8 text-xs px-1" />
        </div>
        <div className="flex items-center gap-1" title="Orden del partido">
          <span className="text-[10px] text-muted-foreground">Orden</span>
          <Input type="number" value={orden} onChange={(e) => setOrden(e.target.value)} className="h-8 text-xs px-1" />
        </div>
        <Button size="sm" className="h-8 gap-1" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
