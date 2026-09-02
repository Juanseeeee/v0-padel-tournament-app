"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AdminWrapper } from "@/components/admin-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Crown, Users, ChevronRight, Sparkles, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  sorteado: { label: "Sorteado", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  publicado: { label: "Publicado", className: "bg-green-500/15 text-green-600 dark:text-green-400" },
  finalizado: { label: "Finalizado", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500" },
};

export default function AdminMastersPage() {
  const [temporada, setTemporada] = useState<number>(new Date().getFullYear());
  const [generando, setGenerando] = useState(false);
  const { data, mutate, isLoading } = useSWR<{ masters: any[] }>(
    `/api/admin/masters?temporada=${temporada}`,
    fetcher
  );

  const masters = data?.masters ?? [];

  async function generar() {
    setGenerando(true);
    try {
      const res = await fetch("/api/admin/masters/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporada }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      toast({
        title: "Masters generados",
        description: `${json.creados} creados, ${json.omitidos} ya existían.`,
      });
      mutate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <AdminWrapper title="Masters" description="Master de fin de año por categoría (clasifican los 8 mejores del ranking).">
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Temporada</label>
          <Input
            type="number"
            value={temporada}
            onChange={(e) => setTemporada(Number(e.target.value))}
            className="w-28"
          />
        </div>
        <Button onClick={generar} disabled={generando} className="gap-2">
          {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generar Masters {temporada}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : masters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center flex flex-col items-center gap-3">
            <Crown className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay Masters para {temporada}. Generalos con el botón de arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {masters.map((m) => {
            const badge = ESTADO_BADGE[m.estado] ?? ESTADO_BADGE.borrador;
            return (
              <Link key={m.id} href={`/admin/masters/${m.id}`}>
                <Card className="group transition-all hover:shadow-lg hover:ring-1 hover:ring-primary/30 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <Crown className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{m.categoria_nombre}</p>
                          <p className="text-xs text-muted-foreground">Master {m.temporada}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge className={badge.className} variant="secondary">{badge.label}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {m.participantes_count} clasificados
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AdminWrapper>
  );
}
