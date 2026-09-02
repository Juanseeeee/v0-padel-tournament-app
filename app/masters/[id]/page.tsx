"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LigaLogo } from "@/components/liga-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Crown, Download, ArrowLeft, CalendarDays, Loader2, Users } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Geometría fija de la llave de 4 equipos (coordenadas calculadas, export-friendly)
const CARD_W = 210;
const CARD_H = 58;
const MIDY = CARD_H / 2;
const POS: Record<string, { x: number; y: number }> = {
  "semis-1": { x: 0, y: 0 },
  "semis-2": { x: 0, y: 160 },
  "final-1": { x: 300, y: 80 },
};
const CHAMP = { x: 600, y: 80 };
const CANVAS_W = CHAMP.x + CARD_W;
const CANVAS_H = 160 + CARD_H;

export default function MasterBracketPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useSWR<any>(`/api/masters/${id}`, fetcher);
  const captureRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const master = data?.master;
  const participantes: any[] = data?.participantes ?? [];
  const llaves: any[] = data?.llaves ?? [];

  // pareja_numero -> equipo { apellidos, seed }
  const equipos = useMemo(() => {
    const map: Record<number, { jugadores: any[] }> = {};
    for (const p of participantes) {
      if (p.pareja_numero == null) continue;
      (map[p.pareja_numero] ||= { jugadores: [] }).jugadores.push(p);
    }
    return map;
  }, [participantes]);

  const teamName = (numero: number | null): string | null => {
    if (numero == null) return null;
    const e = equipos[numero];
    if (!e) return `Pareja ${numero}`;
    return e.jugadores.map((j) => `${j.apellido} ${j.nombre?.charAt(0)}.`).join(" / ");
  };

  const finalMatch = llaves.find((l) => l.ronda === "final");
  const campeonNum = finalMatch?.ganador_numero ?? null;
  const campeon = campeonNum != null ? teamName(campeonNum) : null;

  async function descargar() {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
      const canvas = await html2canvas(captureRef.current, { scale: 2, backgroundColor: bg, useCORS: true });
      const link = document.createElement("a");
      link.download = `master-${master?.categoria_nombre ?? "llave"}-${master?.temporada ?? ""}.png`.replace(/\s+/g, "-").toLowerCase();
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e: any) {
      toast({ title: "No se pudo generar la imagen", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1 relative z-10 mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/masters">
            <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Masters</Button>
          </Link>
          {master && llaves.length > 0 && (
            <Button onClick={descargar} disabled={downloading} className="gap-2">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Descargar imagen
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error || !master ? (
          <div className="py-24 text-center text-muted-foreground">Este Master no está disponible.</div>
        ) : (
          <>
          <div
            ref={captureRef}
            className="rounded-3xl border bg-gradient-to-b from-card to-background p-6 sm:p-8"
          >
            {/* Encabezado con logo */}
            <div className="flex flex-col items-center gap-3 text-center">
              <LigaLogo size={44} tagline={`Master ${master.temporada}`} />
              <div>
                <h1 className="text-2xl sm:text-3xl font-[var(--font-display)] font-bold text-foreground flex items-center justify-center gap-2">
                  <Crown className="h-6 w-6 text-primary" /> {master.categoria_nombre}
                </h1>
                {(master.fecha_evento || master.dias_juego || master.hora_inicio) && (
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {master.fecha_evento ? new Date(master.fecha_evento).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : master.dias_juego}
                    {master.hora_inicio ? ` · ${master.hora_inicio} hs` : ""}
                  </p>
                )}
              </div>
              {campeon && (
                <Badge className="mt-1 gap-1.5 bg-primary/15 text-primary text-sm px-3 py-1 hover:bg-primary/20">
                  <Crown className="h-4 w-4" /> Campeón: {campeon}
                </Badge>
              )}
            </div>

            {/* Bracket */}
            {llaves.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">El sorteo todavía no se realizó.</p>
            ) : (
              <div className="mt-8 overflow-x-auto pb-2">
                <Bracket llaves={llaves} teamName={teamName} campeon={campeon} />
              </div>
            )}
          </div>
          <ClasificadosPublic participantes={participantes} equipos={equipos} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Bracket({ llaves, teamName, campeon }: { llaves: any[]; teamName: (n: number | null) => string | null; campeon: string | null }) {
  const byKey: Record<string, any> = {};
  for (const l of llaves) byKey[`${l.ronda}-${l.posicion}`] = l;

  // Conectores elbow entre columnas
  const connectors: string[] = [];
  const link = (fromKey: string, toKey: string) => {
    const f = POS[fromKey];
    const t = POS[toKey];
    if (!f || !t) return;
    const x1 = f.x + CARD_W, y1 = f.y + MIDY;
    const x2 = t.x, y2 = t.y + MIDY;
    const midX = (x1 + x2) / 2;
    connectors.push(`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`);
  };
  link("semis-1", "final-1"); link("semis-2", "final-1");
  // final -> campeón (línea recta)
  const fEnd = POS["final-1"];
  connectors.push(`M ${fEnd.x + CARD_W} ${fEnd.y + MIDY} H ${CHAMP.x}`);

  const columnDelay: Record<string, number> = { semis: 0, final: 120 };

  return (
    <div className="relative mx-auto" style={{ width: CANVAS_W, height: CANVAS_H }}>
      {/* Conectores */}
      <svg className="absolute inset-0 pointer-events-none" width={CANVAS_W} height={CANVAS_H}>
        {connectors.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-border" />
        ))}
      </svg>

      {/* Partidos */}
      {Object.entries(POS).map(([key, pos]) => {
        const [ronda] = key.split("-");
        const m = byKey[key];
        if (!m) return null;
        return (
          <div
            key={key}
            className="absolute animate-in fade-in slide-in-from-left-4 duration-500 motion-reduce:animate-none"
            style={{ left: pos.x, top: pos.y, width: CARD_W, animationDelay: `${columnDelay[ronda] ?? 0}ms`, animationFillMode: "backwards" }}
          >
            <MatchNode match={m} teamName={teamName} />
          </div>
        );
      })}

      {/* Campeón */}
      <div
        className="absolute animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none"
        style={{ left: CHAMP.x, top: CHAMP.y, width: CARD_W, animationDelay: "240ms", animationFillMode: "backwards" }}
      >
        <div className={`rounded-xl border-2 p-3 text-center shadow-lg ${campeon ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-dashed border-muted-foreground/30"}`} style={{ minHeight: CARD_H }}>
          <div className="flex items-center justify-center gap-1.5 text-primary">
            <Crown className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Campeón</span>
          </div>
          <p className={`mt-1 text-sm font-bold ${campeon ? "text-foreground" : "text-muted-foreground"}`}>{campeon ?? "A definir"}</p>
        </div>
      </div>
    </div>
  );
}

function ClasificadosPublic({ participantes, equipos }: { participantes: any[]; equipos: Record<number, { jugadores: any[] }> }) {
  if (participantes.length === 0) return null;
  const sorteado = participantes.some((p) => p.pareja_numero != null);
  const reservas = participantes.filter((p) => p.pareja_numero == null);
  const parejaNums = Object.keys(equipos).map(Number).sort((a, b) => a - b);

  const fechasTxt = (n: number) => `${n} ${n === 1 ? "fecha" : "fechas"}`;

  // Línea de datos del jugador: puesto en el ranking + puntos + fechas
  const playerMeta = (j: any) => (
    <p className="text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground/80">#{j.seed} ranking</span>
      {" · "}{Number(j.puntos) || 0} pts
      {" · "}{fechasTxt(Number(j.fechas_jugadas) || 0)}
    </p>
  );

  return (
    <div className="mt-6 rounded-3xl border bg-card p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
        <Users className="h-5 w-5 text-primary" /> Clasificados ({participantes.length})
      </h2>

      {sorteado ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {parejaNums.map((num) => (
            <div key={num} className="rounded-xl border bg-background/50 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/15 px-1.5 text-xs font-bold text-primary">{num}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pareja {num}</span>
              </div>
              <div className="space-y-2">
                {equipos[num]?.jugadores.map((j) => (
                  <div key={j.id} className="min-w-0">
                    <p className="truncate text-sm font-medium">{j.nombre} {j.apellido}</p>
                    {playerMeta(j)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {participantes.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <span className="w-7 text-center text-sm font-bold text-primary shrink-0">#{p.seed}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.nombre} {p.apellido}</p>
                <p className="text-[11px] text-muted-foreground">{Number(p.puntos) || 0} pts · {fechasTxt(Number(p.fechas_jugadas) || 0)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {reservas.length > 0 && sorteado && (
        <p className="mt-3 text-xs text-muted-foreground">
          Reservas: {reservas.map((r) => `${r.nombre} ${r.apellido}`).join(", ")}
        </p>
      )}
    </div>
  );
}

function MatchNode({ match, teamName }: { match: any; teamName: (n: number | null) => string | null }) {
  const t1 = teamName(match.equipo1_numero);
  const t2 = teamName(match.equipo2_numero);
  const g = match.ganador_numero;
  const isBye = (match.equipo1_numero == null) !== (match.equipo2_numero == null);

  const row = (num: number | null, name: string | null, sets: (number | null)[]) => {
    const won = g != null && g === num;
    const placeholder = name == null;
    return (
      <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 ${won ? "bg-primary/12 font-semibold text-foreground" : ""}`}>
        <span className={`flex items-center gap-1.5 truncate text-xs ${placeholder ? "text-muted-foreground/60 italic" : ""}`}>
          {num != null && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted px-1 text-[9px] font-bold text-muted-foreground shrink-0">{num}</span>
          )}
          <span className="truncate">{name ?? (isBye ? "Libre" : "A definir")}</span>
        </span>
        <div className="flex shrink-0 gap-0.5">
          {sets.map((s, i) => s != null && (
            <span key={i} className={`w-4 text-center text-[11px] tabular-nums ${won ? "text-primary font-bold" : "text-muted-foreground"}`}>{s}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {row(match.equipo1_numero, t1, [match.set1_e1, match.set2_e1, match.set3_e1])}
      <div className="h-px bg-border" />
      {row(match.equipo2_numero, t2, [match.set1_e2, match.set2_e2, match.set3_e2])}
    </div>
  );
}
