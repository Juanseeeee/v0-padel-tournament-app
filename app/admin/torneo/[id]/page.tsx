"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Users,
  Trophy,
  Shuffle,
  Play,
  Check,
  X,
  Grid3X3,
  GitBranch,
  Star,
  Loader2,
  Trash2,
  Edit,
  Settings,
  Clock,
  FileDown,
  ImageIcon,
} from "lucide-react";
import { FlyerGenerator } from "@/components/flyer-generator";
import { AdminWrapper } from "@/components/admin-wrapper";
import { toast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import type {
  FechaTorneo,
  Categoria,
  Jugador,
  ParejaTorneo,
  Zona,
  ParejaZona,
  PartidoZona,
  Llave,
} from "@/lib/db";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper para determinar si el partido ya está decidido (2-0)
const isMatchDecided = (r: {set1_p1: string, set1_p2: string, set2_p1: string, set2_p2: string}) => {
  const safeInt = (val: string) => val === "" ? 0 : parseInt(val);
  const s1p1 = safeInt(r.set1_p1);
  const s1p2 = safeInt(r.set1_p2);
  const s2p1 = safeInt(r.set2_p1);
  const s2p2 = safeInt(r.set2_p2);

  const getSetWinner = (p1: number, p2: number) => {
    // Gana si >= 6 y diferencia >= 2
    if (p1 >= 6 && p1 - p2 >= 2) return 1;
    // Tiebreak 7-6
    if (p1 === 7 && p2 === 6) return 1;
    // 7-5
    if (p1 === 7 && p2 === 5) return 1;
    
    // Gana P2
    if (p2 >= 6 && p2 - p1 >= 2) return 2;
    if (p2 === 7 && p1 === 6) return 2;
    if (p2 === 7 && p1 === 5) return 2;
    
    return 0;
  };

  const w1 = getSetWinner(s1p1, s1p2);
  const w2 = getSetWinner(s2p1, s2p2);
  
  // Si ambos sets tienen ganador y es el mismo, partido decidido
  return w1 !== 0 && w1 === w2;
};

export default function TorneoManagementPage() {
  const params = useParams();
  const router = useRouter();
  const torneoId = params.id as string;

  const [showParejaDialog, setShowParejaDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showResultadoDialog, setShowResultadoDialog] = useState(false);
  const [showLlaveResultadoDialog, setShowLlaveResultadoDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showDeleteTorneoAlert, setShowDeleteTorneoAlert] = useState(false);
  const [selectedPartido, setSelectedPartido] = useState<PartidoZona | null>(null);
  const [selectedLlave, setSelectedLlave] = useState<Llave | null>(null);
  const [parejaToDelete, setParejaToDelete] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("parejas");
  const [showFlyerDialog, setShowFlyerDialog] = useState(false);

  // Form states
  const [jugador1Id, setJugador1Id] = useState("");
  const [jugador2Id, setJugador2Id] = useState("");
  const [cabezaSerie, setCabezaSerie] = useState(false);
  const [diaPreferido, setDiaPreferido] = useState("");
  const [horaDisponible, setHoraDisponible] = useState("");
  const [assignZonaId, setAssignZonaId] = useState("");
  const [previewZonaPairs, setPreviewZonaPairs] = useState<ParejaZona[]>([]);
  const [loadingZonaPreview, setLoadingZonaPreview] = useState(false);

  const [configDias, setConfigDias] = useState("3");
  const [configTipoZona, setConfigTipoZona] = useState<"grupos_3" | "grupos_4">("grupos_3");
  const [configMinutos, setConfigMinutos] = useState("60");

  const [resultado, setResultado] = useState({
    set1_p1: "",
    set1_p2: "",
    set2_p1: "",
    set2_p2: "",
    set3_p1: "",
    set3_p2: "",
  });

  // Helper para validar y clampear el valor de games (max dinámico según modalidad)
  const handleSetChange = (field: string, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    
    let max = 7;
    if (torneo?.modalidad?.includes("americano")) {
        max = 25; // Permitir más games en americano (ej: a 21)
    } else if (torneo?.modalidad === "2_sets_6_tiebreak" && (field === "set3_p1" || field === "set3_p2")) {
        max = 30; // Super tiebreak
    }

    if (value !== "" && parseInt(value) > max) return;

    setResultado(prev => {
        const newRes = { ...prev, [field]: value };
        // Si el partido está decidido por los dos primeros sets, limpiar el 3ro
        if (isMatchDecided(newRes)) {
            newRes.set3_p1 = "";
            newRes.set3_p2 = "";
        }
        return newRes;
    });
  };

  // Tipo extendido para torneo con categoría
  type TorneoExtendido = FechaTorneo & {
    categoria_id: number | null;
    categoria_nombre: string | null;
    dias_torneo: number;
    formato_zona: number;
    duracion_partido_min: number;
    hora_inicio_viernes: string | null;
    hora_inicio_sabado: string | null;
    modalidad: string | null;
    dias_juego: string | null;
  };

  const { data: torneo, error: torneoError } = useSWR<TorneoExtendido>(
    `/api/admin/fechas/${torneoId}`,
    fetcher
  );

  const { data: jugadoresData } = useSWR<{ jugadores: Jugador[] }>("/api/admin/jugadores", fetcher);
  const jugadores = jugadoresData?.jugadores;
  
  const { data: parejasRaw, mutate: mutateParejas } = useSWR(
    torneoId ? `/api/admin/torneo/${torneoId}/parejas` : null,
    fetcher
  );
  const parejas: ParejaTorneo[] = Array.isArray(parejasRaw) ? parejasRaw : [];
  const { data: zonas, mutate: mutateZonas } = useSWR<Zona[]>(
    torneo?.categoria_id ? `/api/admin/torneo/${torneoId}/zonas?categoria=${torneo.categoria_id}` : null,
    fetcher
  );
  const { data: llaves, mutate: mutateLlaves } = useSWR<Llave[]>(
    torneo?.categoria_id ? `/api/admin/torneo/${torneoId}/llaves?categoria=${torneo.categoria_id}` : null,
    fetcher
  );
  
  // Cargar la config desde el torneo directamente (la config ya está en el torneo)
  useEffect(() => {
    if (torneo) {
      setConfigDias(torneo.dias_torneo?.toString() || "3");
      setConfigTipoZona(torneo.formato_zona === 4 ? "grupos_4" : "grupos_3");
      setConfigMinutos(torneo.duracion_partido_min?.toString() || "60");
    }
  }, [torneo]);
  
  useEffect(() => {
    if (!assignZonaId) {
      setPreviewZonaPairs([]);
      return;
    }
    setLoadingZonaPreview(true);
    fetch(`/api/admin/torneo/${torneoId}/zonas/${assignZonaId}`)
      .then(res => res.json())
      .then(data => {
        setPreviewZonaPairs(data?.parejas || []);
      })
      .catch(() => {
        setPreviewZonaPairs([]);
      })
      .finally(() => setLoadingZonaPreview(false));
  }, [assignZonaId, torneoId]);

  const parejasCategoria = parejas?.filter(
    (p) => !torneo?.categoria_id || p.categoria_id === torneo.categoria_id
  );

  // Obtener IDs de jugadores ya inscritos en el torneo
  const jugadoresInscritos = new Set<number>();
  parejas?.forEach((pareja) => {
    if (pareja.jugador1_id) jugadoresInscritos.add(pareja.jugador1_id);
    if (pareja.jugador2_id) jugadoresInscritos.add(pareja.jugador2_id);
  });

  const handleAddPareja = async () => {
    if (!jugador1Id || !jugador2Id || !torneo?.categoria_id) {
      toast({ title: "Datos incompletos", description: "Faltan datos para crear la pareja", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/parejas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jugador1_id: parseInt(jugador1Id),
          jugador2_id: parseInt(jugador2Id),
          categoria_id: torneo.categoria_id,
          cabeza_serie: cabezaSerie,
          dia_preferido: diaPreferido || null,
          hora_disponible: horaDisponible || null,
          zona_id: assignZonaId ? parseInt(assignZonaId) : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear pareja");
      }

      mutateParejas();
      if (assignZonaId) {
        mutateZonas();
      }
      setShowParejaDialog(false);
      resetParejaForm();
    } catch (error) {
      toast({ title: "Error al crear pareja", description: error instanceof Error ? error.message : "No se pudo crear la pareja", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePareja = async () => {
    if (!parejaToDelete) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/parejas/${parejaToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar pareja");

      mutateParejas();
      setShowDeleteAlert(false);
      setParejaToDelete(null);
    } catch (error) {
      toast({ title: "Error al eliminar pareja", description: "No se pudo eliminar la pareja", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!torneo) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/fechas/${torneoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...torneo,
          dias_torneo: parseInt(configDias),
          formato_zona: configTipoZona === "grupos_3" ? 3 : 4,
          duracion_partido_min: parseInt(configMinutos),
        }),
      });

      if (!res.ok) throw new Error("Error al guardar configuración");

      setShowConfigDialog(false);
      mutate(`/api/admin/fechas/${torneoId}`);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar la configuración", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerarZonas = async () => {
    if (!torneo?.categoria_id) {
      toast({ title: "Datos faltantes", description: "El torneo no tiene categoría asignada", variant: "destructive" });
      return;
    }

    if (torneo.estado === 'finalizada') {
      toast({ title: "Acción no permitida", description: "No se pueden generar zonas en un torneo finalizado", variant: "destructive" });
      return;
    }

    if (!parejasCategoria || parejasCategoria.length < 3) {
      toast({ title: "Requisito mínimo", description: "Se necesitan al menos 3 parejas para generar zonas", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: torneo.categoria_id,
          formato_zona: torneo.formato_zona || 3,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al generar zonas");
      }

      mutateZonas();
      setActiveTab("zonas");
    } catch (error) {
      toast({ title: "Error al generar zonas", description: error instanceof Error ? error.message : "No se pudieron generar las zonas", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuardarResultado = async () => {
    if (!selectedPartido) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/partidos/${selectedPartido.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          set1_p1: resultado.set1_p1 ? parseInt(resultado.set1_p1) : null,
          set1_p2: resultado.set1_p2 ? parseInt(resultado.set1_p2) : null,
          set2_p1: resultado.set2_p1 ? parseInt(resultado.set2_p1) : null,
          set2_p2: resultado.set2_p2 ? parseInt(resultado.set2_p2) : null,
          set3_p1: resultado.set3_p1 ? parseInt(resultado.set3_p1) : null,
          set3_p2: resultado.set3_p2 ? parseInt(resultado.set3_p2) : null,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar resultado");

      mutateZonas();
      setShowResultadoDialog(false);
      setSelectedPartido(null);
      setResultado({ set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar el resultado", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerarLlaves = async () => {
    if (!torneo?.categoria_id) {
      toast({ title: "Datos faltantes", description: "El torneo no tiene categoría asignada", variant: "destructive" });
      return;
    }

    if (torneo.estado === 'finalizada') {
      toast({ title: "Acción no permitida", description: "No se pueden generar llaves en un torneo finalizado", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/llaves/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: torneo.categoria_id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al generar llaves");
      }

      mutateLlaves();
      setActiveTab("llaves");
    } catch (error) {
      toast({ title: "Error al generar llaves", description: error instanceof Error ? error.message : "No se pudieron generar las llaves", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuardarResultadoLlave = async () => {
    if (!selectedLlave) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/llaves/${selectedLlave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar resultado");
      }

      mutateLlaves();
      setShowLlaveResultadoDialog(false);
      setSelectedLlave(null);
      setResultado({ set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar el resultado", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizarTorneo = async () => {
    if (!confirm("¿Estás seguro de finalizar el torneo? Se calcularán los puntos automáticamente.")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/cerrar`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al finalizar torneo");
      }

      toast({ title: "Torneo finalizado", description: data.message || "Los puntos han sido asignados automáticamente." });
      mutate(`/api/admin/fechas/${torneoId}`);
      router.push("/admin/fechas");
    } catch (error) {
      toast({ title: "Error al finalizar torneo", description: error instanceof Error ? error.message : "No se pudo finalizar el torneo", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminarTorneo = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/fechas/${torneoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar torneo");
      }
      setShowDeleteTorneoAlert(false);
      toast({ title: "Torneo eliminado", description: "El torneo fue eliminado correctamente." });
      router.push("/admin/fechas");
    } catch (error) {
      toast({ title: "Error al eliminar torneo", description: error instanceof Error ? error.message : "No se pudo eliminar el torneo", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetParejaForm = () => {
    setJugador1Id("");
    setJugador2Id("");
    setCabezaSerie(false);
    setDiaPreferido("");
    setHoraDisponible("");
    setAssignZonaId("");
    setPreviewZonaPairs([]);
  };

  const openResultadoDialog = (partido: PartidoZona) => {
    setSelectedPartido(partido);
    setResultado({
      set1_p1: partido.set1_p1?.toString() || "",
      set1_p2: partido.set1_p2?.toString() || "",
      set2_p1: partido.set2_p1?.toString() || "",
      set2_p2: partido.set2_p2?.toString() || "",
      set3_p1: partido.set3_p1?.toString() || "",
      set3_p2: partido.set3_p2?.toString() || "",
    });
    setShowResultadoDialog(true);
  };

  const openLlaveResultadoDialog = (llave: Llave) => {
    setSelectedLlave(llave);
    setResultado({
      set1_p1: llave.set1_pareja1?.toString() || "",
      set1_p2: llave.set1_pareja2?.toString() || "",
      set2_p1: llave.set2_pareja1?.toString() || "",
      set2_p2: llave.set2_pareja2?.toString() || "",
      set3_p1: llave.set3_pareja1?.toString() || "",
      set3_p2: llave.set3_pareja2?.toString() || "",
    });
    setShowLlaveResultadoDialog(true);
  };

  if (torneoError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Error al cargar el torneo</p>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminWrapper
      title={`Fecha ${torneo.numero_fecha}`}
      description={`${new Date(torneo.fecha_calendario).toLocaleDateString("es-AR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })} - ${torneo.sede}`}
      headerActions={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              torneo.estado === "programada"
                ? "border-blue-500/30 bg-blue-500/20 text-blue-400"
                : torneo.estado === "en_juego"
                  ? "border-primary/30 bg-primary/20 text-primary"
                  : "border-border bg-muted text-muted-foreground"
            }
          >
            {torneo.estado === "programada"
              ? "Programada"
              : torneo.estado === "en_juego"
                ? "En Juego"
                : "Finalizada"}
          </Badge>
          {torneo.estado !== "finalizada" && (
            <Button
              onClick={handleFinalizarTorneo}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Finalizar Torneo
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setShowDeleteTorneoAlert(true)}
            disabled={isSubmitting}
            className="shadow-lg shadow-destructive/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar Torneo
          </Button>
        </div>
      }
    >
      {/* Info de categoría y configuración */}
      <Card className="mb-6 border-0 shadow-lg backdrop-blur-sm bg-white/50 dark:bg-black/50">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Categoría</Label>
              <p className="font-semibold text-lg">{torneo.categoria_nombre || "Sin categoría"}</p>
            </div>
            <div className="sm:border-l sm:pl-4">
              <Label className="text-muted-foreground text-xs">Configuración</Label>
              <p className="text-sm">
                {`VIE ${torneo.hora_inicio_viernes || '18:00'}hs | SAB ${torneo.hora_inicio_sabado || '18:00'}hs | `}Zonas de {torneo.formato_zona || 3} parejas | {torneo.duracion_partido_min || 60} min/partido
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)} className="w-full sm:w-auto">
              <Settings className="mr-2 h-4 w-4" />
              Editar Config
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
          <TabsTrigger value="parejas" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Parejas</span>
            <span className="sm:hidden">({parejasCategoria?.length || 0})</span>
            <span className="hidden sm:inline">({parejasCategoria?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="zonas" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Grid3X3 className="h-4 w-4" />
            Zonas
          </TabsTrigger>
          <TabsTrigger value="llaves" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <GitBranch className="h-4 w-4" />
            Llaves
          </TabsTrigger>
        </TabsList>

        {/* Tab Parejas */}
        <TabsContent value="parejas">
          <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/50 dark:bg-black/50">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Parejas Inscriptas</CardTitle>
                {parejasCategoria && parejasCategoria.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {parejasCategoria.length} parejas | 
                    VIE: {parejasCategoria.filter((p: any) => p.dia_preferido === "viernes").length} | 
                    SAB: {parejasCategoria.filter((p: any) => p.dia_preferido === "sabado").length} | 
                    Flexible: {parejasCategoria.filter((p: any) => !p.dia_preferido).length}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowParejaDialog(true)} className="flex-1 sm:flex-none">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
                <Button variant="outline" onClick={() => setShowFlyerDialog(true)} className="flex-1 sm:flex-none">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Flyer
                </Button>
                {torneo?.categoria_id && parejasCategoria && parejasCategoria.length >= 3 && (
                  <Button variant="secondary" onClick={handleGenerarZonas} disabled={isSubmitting || torneo.estado === 'finalizada'} className="flex-1 sm:flex-none w-full sm:w-auto">
                    <Shuffle className="mr-2 h-4 w-4" />
                    Generar Zonas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
                {!parejasCategoria || parejasCategoria.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="mb-4 h-12 w-12 opacity-50" />
                    <p>No hay parejas inscriptas</p>
                    <p className="text-sm">Agrega parejas para comenzar a armar el torneo</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Jugador 1</TableHead>
                        <TableHead>Jugador 2</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="w-24">Cabeza</TableHead>
                        <TableHead>Preferencia</TableHead>
                        <TableHead className="w-24">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parejasCategoria.map((pareja) => (
                        <TableRow key={pareja.id}>
                          <TableCell className="font-medium">{pareja.numero_pareja}</TableCell>
                          <TableCell>
                            {pareja.jugador1_nombre} {pareja.jugador1_apellido}
                          </TableCell>
                          <TableCell>
                            {pareja.jugador2_nombre} {pareja.jugador2_apellido}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{pareja.categoria_nombre}</Badge>
                          </TableCell>
                          <TableCell>
                            {pareja.cabeza_serie && (
                              <Star className="h-4 w-4 text-accent" />
                            )}
                          </TableCell>
                          <TableCell>
                            {pareja.dia_preferido || pareja.hora_disponible ? (
                              <div className="flex items-center gap-1 text-xs">
                                {pareja.dia_preferido && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {pareja.dia_preferido === 'viernes' ? 'VIE' : 'SAB'}
                                  </Badge>
                                )}
                                {pareja.hora_disponible && (
                                  <span className="text-muted-foreground">{pareja.hora_disponible}hs</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Flexible</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setParejaToDelete(pareja.id);
                                setShowDeleteAlert(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Zonas */}
          <TabsContent value="zonas">
            <ZonasTab
              torneoId={torneoId}
              categoriaId={torneo?.categoria_id?.toString() || ""}
              zonas={zonas}
              onGenerarLlaves={handleGenerarLlaves}
              isSubmitting={isSubmitting}
              horaInicioViernes={torneo?.hora_inicio_viernes || "18:00"}
              horaInicioSabado={torneo?.hora_inicio_sabado || "18:00"}
              duracionPartido={torneo?.duracion_partido_min || 60}
              onZonaUpdate={() => { mutateZonas(); mutateLlaves(); }}
              modalidad={torneo?.modalidad || "normal"}
              torneoEstado={torneo?.estado}
            />
          </TabsContent>

          {/* Tab Llaves */}
          <TabsContent value="llaves">
            <LlavesTab
              llaves={llaves}
              onResultadoClick={openLlaveResultadoDialog}
              onFinalizarTorneo={handleFinalizarTorneo}
              torneoEstado={torneo?.estado || 'activo'}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
        </Tabs>

        {/* Dialog Agregar Pareja */}
        <Dialog open={showParejaDialog} onOpenChange={setShowParejaDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Pareja</DialogTitle>
              <DialogDescription>
                Categoría: <span className="font-semibold text-foreground">
                  {torneo?.categoria_nombre || "Sin categoría"}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Jugador 1</Label>
                <Select 
                  value={jugador1Id} 
                  onValueChange={setJugador1Id}
                  disabled={!torneo?.categoria_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {jugadores
                      ?.filter((j) => 
                        j.estado === "activo" && 
                        j.id.toString() !== jugador2Id &&
                        !jugadoresInscritos.has(j.id) &&
                        (j.categoria_actual_id === torneo?.categoria_id || 
                         (j.categoria_ids && j.categoria_ids.split(',').map(Number).includes(torneo?.categoria_id)))
                      )
                      .map((j) => (
                        <SelectItem key={j.id} value={j.id.toString()}>
                          {j.nombre} {j.apellido} {j.localidad && `(${j.localidad})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Jugador 2</Label>
                <Select 
                  value={jugador2Id} 
                  onValueChange={setJugador2Id}
                  disabled={!torneo?.categoria_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {jugadores
                      ?.filter((j) => 
                        j.estado === "activo" && 
                        j.id.toString() !== jugador1Id &&
                        !jugadoresInscritos.has(j.id) &&
                        (j.categoria_actual_id === torneo?.categoria_id || 
                         (j.categoria_ids && j.categoria_ids.split(',').map(Number).includes(torneo?.categoria_id)))
                      )
                      .map((j) => (
                        <SelectItem key={j.id} value={j.id.toString()}>
                          {j.nombre} {j.apellido} {j.localidad && `(${j.localidad})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cabezaSerie"
                  checked={cabezaSerie}
                  onChange={(e) => setCabezaSerie(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="cabezaSerie">Cabeza de serie</Label>
              </div>

              {/* Preferencias de horario */}
              <div className="border-t pt-3 mt-3">
                <Label className="text-sm font-semibold text-muted-foreground">Preferencia de horario (opcional)</Label>
                {(() => {
                  const duracion = torneo?.duracion_partido_min || 60;
                  const canchas = 1; // estimado base
                  const countViernes = (parejasCategoria || []).filter((p: any) => p.dia_preferido === "viernes").length;
                  const countSabado = (parejasCategoria || []).filter((p: any) => p.dia_preferido === "sabado").length;
                  // Estimate: each zone ~3 parejas, ~3 partidos, ~3hrs per zone per cancha
                  const partidosEstViernes = Math.ceil(countViernes / 3) * 3;
                  const horasViernes = (partidosEstViernes * duracion) / (60 * canchas);
                  const partidosEstSabado = Math.ceil(countSabado / 3) * 3;
                  const horasSabado = (partidosEstSabado * duracion) / (60 * canchas);
                  const limiteHoras = 4; // mas de 4hs ya es extenso
                  const warningViernes = horasViernes > limiteHoras;
                  const warningSabado = horasSabado > limiteHoras;
                  const showWarning = (diaPreferido === "viernes" && warningViernes) || (diaPreferido === "sabado" && warningSabado);
                  const diaWarning = diaPreferido === "viernes" ? "viernes" : "sabado";
                  const countWarning = diaPreferido === "viernes" ? countViernes : countSabado;
                  const horasWarning = diaPreferido === "viernes" ? horasViernes : horasSabado;
                  const otroDia = diaPreferido === "viernes" ? "sabado" : "viernes";

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">Dia preferido</Label>
                          <Select
                            value={diaPreferido || "sin_preferencia"}
                            onValueChange={(val) => setDiaPreferido(val === "sin_preferencia" ? "" : val)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Sin preferencia" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sin_preferencia">Sin preferencia</SelectItem>
                              <SelectItem value="viernes">Viernes ({countViernes} parejas)</SelectItem>
                              <SelectItem value="sabado">Sabado ({countSabado} parejas)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Disponible desde</Label>
                          <Input
                            type="time"
                            value={horaDisponible}
                            onChange={(e) => setHoraDisponible(e.target.value)}
                            placeholder="Ej: 18:00"
                          />
                        </div>
                      </div>
                      {showWarning && (
                        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
                          <p className="font-semibold text-amber-800 dark:text-amber-300">
                            Atencion: Ya hay {countWarning} parejas para el {diaWarning}
                          </p>
                          <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                            Se estima ~{horasWarning.toFixed(1)} horas de juego. El {diaWarning} puede hacerse muy extenso.
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setDiaPreferido(otroDia)}
                            >
                              Pasar al {otroDia}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                            >
                              Dejar el {diaWarning}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="border-t pt-3 mt-3">
                <Label className="text-sm font-semibold text-muted-foreground">Asignar a zona (opcional)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Zona</Label>
                    <Select
                      value={assignZonaId || ""}
                      onValueChange={(val) => setAssignZonaId(val)}
                      disabled={!zonas || zonas.length === 0}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder={(!zonas || zonas.length === 0) ? "Sin zonas disponibles" : "Seleccionar zona"} />
                      </SelectTrigger>
                      <SelectContent>
                        {zonas?.map((z) => (
                          <SelectItem key={z.id} value={z.id.toString()}>
                            {z.nombre} · {((z as any).parejas_count || 0)}/{torneo.formato_zona} {z.estado === 'finalizada' ? '(cerrada)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Previsualización</Label>
                    <div className="rounded border p-2 text-xs min-h-[40px]">
                      {loadingZonaPreview ? (
                        <span className="text-muted-foreground">Cargando...</span>
                      ) : previewZonaPairs.length === 0 ? (
                        <span className="text-muted-foreground">{assignZonaId ? "Zona vacía" : "Selecciona una zona"}</span>
                      ) : (
                        <ul className="space-y-1">
                          {previewZonaPairs.map((pp) => (
                            <li key={pp.pareja_zona_id}>
                              {pp.j1_nombre} {pp.j1_apellido?.charAt(0)}. / {pp.j2_nombre} {pp.j2_apellido?.charAt(0)}.
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowParejaDialog(false); resetParejaForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleAddPareja} disabled={isSubmitting || !jugador1Id || !jugador2Id}>
                {isSubmitting ? "Guardando..." : "Agregar Pareja"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Config Dialog */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configuracion del Torneo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Dias del torneo</Label>
                <Select value={configDias} onValueChange={setConfigDias}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 dias</SelectItem>
                    <SelectItem value="3">3 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Formato de zona</Label>
                <Select value={configTipoZona} onValueChange={(v: "grupos_3" | "grupos_4") => setConfigTipoZona(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grupos_3">Grupos de 3 parejas</SelectItem>
                    <SelectItem value="grupos_4">Grupos de 4 parejas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Duracion de partido (min)</Label>
                <Input type="number" value={configMinutos} onChange={(e) => setConfigMinutos(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveConfig} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Alert */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar pareja?</AlertDialogTitle>
              <AlertDialogDescription>Esta accion no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePareja} disabled={isSubmitting}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteTorneoAlert} onOpenChange={setShowDeleteTorneoAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar torneo?</AlertDialogTitle>
              <AlertDialogDescription>Se eliminarán zonas, llaves e inscripciones asociadas. Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleEliminarTorneo} disabled={isSubmitting}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Flyer Generator */}
        {torneo && (
          <FlyerGenerator
            data={{
              nombreTorneo: `Fecha ${torneo.numero_fecha}`,
              numeroFecha: torneo.numero_fecha,
              categoriaNombre: torneo.categoria_nombre || "",
              fechaCalendario: torneo.fecha_calendario || "",
              sede: torneo.sede || "",
              horaViernes: torneo.hora_inicio_viernes || "",
              horaSabado: torneo.hora_inicio_sabado || "",
            }}
            open={showFlyerDialog}
            onOpenChange={setShowFlyerDialog}
          />
        )}

        {/* Dialog Resultado Llaves */}
        <Dialog open={showLlaveResultadoDialog} onOpenChange={setShowLlaveResultadoDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resultado del Partido (Llave)</DialogTitle>
              <DialogDescription>
                {selectedLlave && (
                  <span className="block mt-2">
                    {selectedLlave.pareja1_id ? (selectedLlave.pareja1_jugadores || `Pareja ${selectedLlave.pareja1_id}`) : "Por definir"} 
                    {" vs "}
                    {selectedLlave.pareja2_id ? (selectedLlave.pareja2_jugadores || `Pareja ${selectedLlave.pareja2_id}`) : "Por definir"}
                  </span>
                )}
                <span className="block mt-1 text-xs text-muted-foreground">
                    Modalidad: {torneo?.modalidad?.replace(/_/g, " ").toUpperCase() || "NORMAL"}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {torneo?.modalidad?.includes("americano") ? (
                  // Modalidad Americano (1 set)
                  <div className="grid grid-cols-5 items-center gap-2">
                    <Label className="col-span-1">Games</Label>
                    <Input
                      type="number" min="0" max="15" className="col-span-2" placeholder="P1"
                      value={resultado.set1_p1} onChange={(e) => handleSetChange('set1_p1', e.target.value)}
                    />
                    <Input
                      type="number" min="0" max="15" className="col-span-2" placeholder="P2"
                      value={resultado.set1_p2} onChange={(e) => handleSetChange('set1_p2', e.target.value)}
                    />
                  </div>
              ) : (
                  // Modalidad Normal o 2 sets + tiebreak
                  <>
                    <div className="grid grid-cols-5 items-center gap-2">
                        <Label className="col-span-1">Set 1</Label>
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                        value={resultado.set1_p1} onChange={(e) => handleSetChange('set1_p1', e.target.value)}
                        />
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                        value={resultado.set1_p2} onChange={(e) => handleSetChange('set1_p2', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-5 items-center gap-2">
                        <Label className="col-span-1">Set 2</Label>
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                        value={resultado.set2_p1} onChange={(e) => handleSetChange('set2_p1', e.target.value)}
                        />
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                        value={resultado.set2_p2} onChange={(e) => handleSetChange('set2_p2', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-5 items-center gap-2">
                        <Label className="col-span-1 text-muted-foreground">
                            {torneo?.modalidad === '2_sets_6_tiebreak' ? 'Tiebreak' : 'Set 3'}
                        </Label>
                        <Input
                        type="number" min="0" max={torneo?.modalidad === '2_sets_6_tiebreak' ? 20 : 7} className="col-span-2" placeholder="P1"
                        value={resultado.set3_p1} onChange={(e) => handleSetChange('set3_p1', e.target.value)}
                        disabled={isMatchDecided(resultado)}
                        />
                        <Input
                        type="number" min="0" max={torneo?.modalidad === '2_sets_6_tiebreak' ? 20 : 7} className="col-span-2" placeholder="P2"
                        value={resultado.set3_p2} onChange={(e) => handleSetChange('set3_p2', e.target.value)}
                        disabled={isMatchDecided(resultado)}
                        />
                    </div>
                  </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLlaveResultadoDialog(false)}>Cancelar</Button>
              <Button onClick={handleGuardarResultadoLlave} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </AdminWrapper>
  );
}

// Componente Zonas Tab
function ZonasTab({
  torneoId,
  categoriaId,
  zonas,
  onGenerarLlaves,
  isSubmitting,
  horaInicioViernes,
  horaInicioSabado,
  duracionPartido,
  onZonaUpdate,
  modalidad,
  torneoEstado,
}: {
  torneoId: string;
  categoriaId: string;
  zonas: Zona[] | undefined;
  onGenerarLlaves: () => void;
  isSubmitting: boolean;
  horaInicioViernes: string;
  horaInicioSabado: string;
  duracionPartido: number;
  onZonaUpdate: () => void;
  modalidad: string;
  torneoEstado?: string;
}) {
  const [selectedZona, setSelectedZona] = useState<Zona | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  if (!categoriaId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Grid3X3 className="mb-4 h-12 w-12 opacity-50" />
          <p>El torneo no tiene categoría asignada</p>
        </CardContent>
      </Card>
    );
  }

  if (!zonas || zonas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Grid3X3 className="mb-4 h-12 w-12 opacity-50" />
          <p>No hay zonas generadas</p>
          <p className="text-sm">Genera las zonas desde la pestaña de parejas</p>
        </CardContent>
      </Card>
    );
  }

  const todasLasZonasFinalizadas = zonas.every((z) => z.estado === 'finalizada');

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/pdf`);
      if (!res.ok) throw new Error("Error al generar PDF");
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        // Fallback: download as HTML
        const a = document.createElement("a");
        a.href = url;
        a.download = `fixture-fecha-${torneoId}.html`;
        a.click();
      }
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Error al exportar", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
  <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
  {exportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
  {exportingPdf ? "Exportando..." : "Exportar para WhatsApp"}
  </Button>
        {todasLasZonasFinalizadas && (
          <Button onClick={onGenerarLlaves} disabled={isSubmitting || torneoEstado === 'finalizada'}>
            <GitBranch className="mr-2 h-4 w-4" />
            Generar Llaves
          </Button>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zonas.map((zona) => (
          <Card 
            key={zona.id} 
            className="cursor-pointer transition-all hover:scale-[1.02] border-0 shadow-lg hover:shadow-xl backdrop-blur-sm bg-white/50 dark:bg-black/50"
            onClick={() => setSelectedZona(zona)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-primary" />
                  {zona.nombre}
                </span>
                <Badge variant={zona.estado === 'finalizada' ? 'default' : 'secondary'}>
                  {zona.estado === 'finalizada' ? 'Cerrada' : 'En juego'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click para ver detalles y partidos
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                VIE {horaInicioViernes}hs | SAB {horaInicioSabado}hs
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de detalle de zona */}
      <Dialog open={!!selectedZona} onOpenChange={() => setSelectedZona(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedZona && (
            <ZonaDetailContent 
              zona={selectedZona} 
              torneoId={torneoId}
              onClose={() => setSelectedZona(null)}
              onUpdate={onZonaUpdate}
              allZonas={zonas || []}
              horaInicioViernes={horaInicioViernes}
              horaInicioSabado={horaInicioSabado}
              duracionPartido={duracionPartido}
              modalidad={modalidad}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente contenido de zona detallada
function ZonaDetailContent({
  zona,
  torneoId,
  onClose,
  onUpdate,
  allZonas,
  horaInicioViernes,
  horaInicioSabado,
  duracionPartido,
  modalidad,
}: {
  zona: Zona;
  torneoId: string;
  onClose: () => void;
  onUpdate: () => void;
  allZonas: Zona[];
  horaInicioViernes: string;
  horaInicioSabado: string;
  duracionPartido?: number;
  modalidad: string;
}) {
  const { data, mutate } = useSWR<{ zona: Zona; parejas: ParejaZona[]; partidos: PartidoZona[] }>(
    `/api/admin/torneo/${torneoId}/zonas/${zona.id}`,
    fetcher
  );
  const [saving, setSaving] = useState(false);
  const [editingPartido, setEditingPartido] = useState<PartidoZona | null>(null);
  const [movingPareja, setMovingPareja] = useState<number | null>(null);
  const [moveTargetZona, setMoveTargetZona] = useState("");
  const [targetZonePairs, setTargetZonePairs] = useState<ParejaZona[]>([]);
  const [swapPairId, setSwapPairId] = useState<string>("");
  const [resultado, setResultado] = useState({
    set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: ""
  });
  const [dropPairId, setDropPairId] = useState<number | null>(null);
  const [showDropDialog, setShowDropDialog] = useState(false);
  const [dropOption, setDropOption] = useState<"vacante_final" | "reestructurar" | "organizar_3">("vacante_final");
  const [destinosMap, setDestinosMap] = useState<Record<number, string>>({});

  // Fetch pairs when target zone changes
  useEffect(() => {
    if (!moveTargetZona) {
      setTargetZonePairs([]);
      setSwapPairId("");
      return;
    }

    fetch(`/api/admin/torneo/${torneoId}/zonas/${moveTargetZona}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.parejas) {
          setTargetZonePairs(data.parejas);
        }
      })
      .catch(console.error);
  }, [moveTargetZona, torneoId]);

  const handleSetChange = (field: string, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    
    let max = 7;
    if (modalidad?.includes("americano")) {
        max = 25; // Permitir más games en americano (ej: a 21)
    } else if (modalidad === "2_sets_6_tiebreak" && (field === "set3_p1" || field === "set3_p2")) {
        max = 30; // Super tiebreak
    }

    if (value !== "" && parseInt(value) > max) return;

    setResultado(prev => {
        const newRes = { ...prev, [field]: value };
        // Si el partido está decidido por los dos primeros sets, limpiar el 3ro
        if (isMatchDecided(newRes)) {
            newRes.set3_p1 = "";
            newRes.set3_p2 = "";
        }
        return newRes;
    });
  };

  const parejas = data?.parejas || [];
  const partidos = data?.partidos || [];
  const zonaData = data?.zona || zona;

  // Ordenar parejas por puntos y diferencia de sets
  const parejasOrdenadas = [...parejas].sort((a, b) => {
    const puntosA = a.partidos_ganados || 0;
    const puntosB = b.partidos_ganados || 0;
    if (puntosB !== puntosA) return puntosB - puntosA;
    const diffA = (a.sets_ganados || 0) - (a.sets_perdidos || 0);
    const diffB = (b.sets_ganados || 0) - (b.sets_perdidos || 0);
    if (diffB !== diffA) return diffB - diffA;
    return (b.sets_ganados || 0) - (a.sets_ganados || 0);
  });

  const getNombrePareja = (parejaId: number | null) => {
    if (!parejaId) return "Por definir";
    const pareja = parejas.find(p => p.pareja_torneo_id === parejaId);
    if (!pareja) return "?";
    return `${pareja.j1_nombre} ${pareja.j1_apellido?.charAt(0)}. / ${pareja.j2_nombre} ${pareja.j2_apellido?.charAt(0)}.`;
  };

  const getTipoPartidoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'inicial': 'Partido 1',
      'inicial_1': 'Semifinal 1',
      'inicial_2': 'Semifinal 2',
      'perdedor_vs_3': 'Perdedor vs Pareja 3',
      'ganador_vs_3': 'Ganador vs Pareja 3',
      'perdedores': 'Por 3er puesto',
      'ganadores': 'Final',
      'round_robin': 'Partido',
      'tiebreak_1': 'Tiebreak 1',
      'tiebreak_2': 'Tiebreak 2',
    };
    return labels[tipo] || tipo;
  };

  const handleSaveResultado = async () => {
    if (!editingPartido) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/torneo/${torneoId}/zonas/${zona.id}/partidos/${editingPartido.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resultado),
        }
      );
      if (res.ok) {
        setEditingPartido(null);
        setResultado({ set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "" });
        mutate();
        onUpdate();
      } else {
        toast({ title: "Error", description: "No se pudo guardar el resultado", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar el resultado", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const [showTieDialog, setShowTieDialog] = useState(false);
  const [resolvingTie, setResolvingTie] = useState(false);
  const isTripleTie = (): boolean => {
    if (parejas.length !== 3) return false;
    if (partidos.length === 0 || partidosFinalizados !== totalPartidos) return false;
    const wins = new Set(parejas.map((p: any) => Number(p.partidos_ganados || 0)));
    const setDiff = new Set(parejas.map((p: any) => Number((p.sets_ganados || 0) - (p.sets_perdidos || 0))));
    const gameDiff = new Set(parejas.map((p: any) => Number((p.games_ganados || 0) - (p.games_perdidos || 0))));
    return wins.size === 1 && setDiff.size === 1 && gameDiff.size === 1;
  };

  const handleCerrarZona = async () => {
    if (!confirm("¿Estás seguro de cerrar esta zona? Las parejas clasificadas pasarán a llaves.")) return;
    if (isTripleTie()) {
      setShowTieDialog(true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/${zona.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: 'finalizada' }),
      });
      if (res.ok) {
        mutate();
        onUpdate();
        onClose();
      } else {
        toast({ title: "Error", description: "No se pudo cerrar la zona", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cerrar la zona", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resolverEmpate = async (metodo: "sorteo" | "tiebreak") => {
    setResolvingTie(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/${zona.id}/resolver-empate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metodo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error al resolver empate", description: data.error || "No se pudo resolver el empate", variant: "destructive" });
        return;
      }
      setShowTieDialog(false);
      mutate();
      onUpdate();
      if (metodo === "sorteo") onClose();
    } catch {
      toast({ title: "Error", description: "No se pudo resolver el empate", variant: "destructive" });
    } finally {
      setResolvingTie(false);
    }
  };

  const handleMoverPareja = async () => {
    if (!movingPareja || !moveTargetZona) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/mover-pareja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pareja_torneo_id: movingPareja,
          zona_origen_id: zona.id,
          zona_destino_id: parseInt(moveTargetZona),
          pareja_intercambio_id: swapPairId ? parseInt(swapPairId) : null,
        }),
      });
      if (res.ok) {
        setMovingPareja(null);
        setMoveTargetZona("");
        setSwapPairId("");
        setTargetZonePairs([]);
        mutate();
        onUpdate();
      } else {
        const err = await res.json();
        toast({ title: "Error al mover pareja", description: err.error || "No se pudo mover la pareja", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo mover la pareja", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Calculate estimated time for each match
  const getHorarioPartido = (index: number, dia?: string): string => {
  if (!duracionPartido) return "";
  const base = dia === "sabado" ? horaInicioSabado : horaInicioViernes;
  const [h, m] = base.split(":").map(Number);
  const totalMinutes = h * 60 + m + index * duracionPartido;
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
  };

  const otherZonas = allZonas.filter(z => z.id !== zona.id && z.estado !== 'finalizada');
  const otherZonasCapaces = otherZonas.filter(z => (((z as any).parejas_count || 0) < torneo.formato_zona));
  const hasZona4Disponible = otherZonas.some(z => ((z as any).parejas_count || 0) === 4);
  const autoRebalanceCase = parejas.length === 3 && hasZona4Disponible;

  const partidosFinalizados = partidos.filter(p => p.estado === 'finalizado').length;
  const totalPartidos = partidos.length;
  const puedenDefinirse = partidos.filter(p => p.pareja1_id && p.pareja2_id).length;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            {zonaData.nombre}
          </span>
          <Badge variant={zonaData.estado === 'finalizada' ? 'default' : 'secondary'}>
            {zonaData.estado === 'finalizada' ? 'Cerrada' : `${partidosFinalizados}/${totalPartidos} partidos`}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {parejas.length === 3 
            ? "Zona de 3: Pasan 2 parejas a llaves (1ro y 2do)"
            : parejas.length === 4
              ? "Zona de 4: Pasan 3 parejas a llaves (1ro, 2do y 3ro)"
              : `Zona de ${parejas.length} parejas`
          }
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 mt-4">
        {/* Tabla de posiciones */}
        <div>
          <h4 className="mb-3 font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Tabla de Posiciones
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Pareja</TableHead>
                <TableHead className="text-center">Pts</TableHead>
                <TableHead className="text-center">Sets</TableHead>
                <TableHead className="text-center">Games</TableHead>
                {zonaData.estado !== 'finalizada' && otherZonas.length > 0 && (
                  <TableHead className="w-10"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parejasOrdenadas.map((p, idx) => {
                const clasifica = parejas.length === 3 ? idx < 2 : idx < 3;
                const isMoving = movingPareja === p.pareja_torneo_id;
                return (
                  <TableRow key={p.pareja_zona_id} className={clasifica ? "bg-primary/10" : ""}>
                    <TableCell className="font-medium">
                      {idx + 1}
                      {clasifica && <span className="ml-1 text-primary">*</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">
                            {p.j1_nombre} {p.j1_apellido?.charAt(0)}. / {p.j2_nombre} {p.j2_apellido?.charAt(0)}.
                          </span>
                          {p.cabeza_serie && <Badge variant="outline" className="text-xs">CS</Badge>}
                        </div>
                        {isMoving && (
                          <div className="flex flex-col gap-2 mt-2 p-2 bg-muted/50 rounded-md border border-border/50">
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Zona destino</Label>
                              <Select
                                value={moveTargetZona}
                                onValueChange={(val) => {
                                  setMoveTargetZona(val);
                                  setSwapPairId("");
                                }}
                              >
                                <SelectTrigger className="h-8 w-full text-xs bg-background">
                                  <SelectValue placeholder="Seleccionar zona..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {otherZonas.map(z => (
                                    <SelectItem key={z.id} value={z.id.toString()}>{z.nombre}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {moveTargetZona && targetZonePairs.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Intercambiar con (opcional)</Label>
                                <Select
                                  value={swapPairId}
                                  onValueChange={setSwapPairId}
                                >
                                  <SelectTrigger className="h-8 w-full text-xs bg-background">
                                    <SelectValue placeholder="Solo mover..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="no_swap">Solo mover (sin intercambio)</SelectItem>
                                    {targetZonePairs.map(tp => (
                                      <SelectItem key={tp.pareja_torneo_id} value={tp.pareja_torneo_id.toString()}>
                                        {tp.j1_nombre} {tp.j1_apellido?.charAt(0)}. / {tp.j2_nombre} {tp.j2_apellido?.charAt(0)}.
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-1">
                              <Button size="sm" variant="default" className="h-7 text-xs flex-1" onClick={handleMoverPareja} disabled={!moveTargetZona || saving}>
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : (swapPairId && swapPairId !== "no_swap" ? "Intercambiar" : "Mover")}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { 
                                setMovingPareja(null); 
                                setMoveTargetZona("");
                                setSwapPairId("");
                                setTargetZonePairs([]);
                              }}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                        {zonaData.estado !== 'finalizada' && (
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title="Baja de pareja"
                              onClick={() => { setDropPairId(p.pareja_torneo_id); setShowDropDialog(true); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{p.partidos_ganados || 0}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="text-primary">{p.sets_ganados || 0}</span>-<span className="text-destructive">{p.sets_perdidos || 0}</span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {p.games_ganados || 0}-{p.games_perdidos || 0}
                    </TableCell>
                    {zonaData.estado !== 'finalizada' && otherZonas.length > 0 && (
                      <TableCell>
                        {!isMoving && partidosFinalizados === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Mover a otra zona"
                            onClick={() => { setMovingPareja(p.pareja_torneo_id); setMoveTargetZona(""); }}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-2">* Clasifica a llaves</p>
        </div>

        {/* Partidos */}
        <div>
          <h4 className="mb-3 font-semibold flex items-center gap-2">
            <Play className="h-4 w-4" />
            Partidos de la Zona
          </h4>
          <div className="space-y-3">
            {partidos.map((partido, idx) => {
              const puedeJugarse = partido.pareja1_id && partido.pareja2_id;
  const dia = partido.dia_partido;
  const horarioDB = partido.fecha_hora_programada;
  const horarioFallback = getHorarioPartido(idx, dia || undefined);
  const horario = horarioDB || horarioFallback;
              const cancha = partido.cancha_numero;
              const diaLabel = dia === 'viernes' ? 'VIE' : dia === 'sabado' ? 'SAB' : dia === 'domingo' ? 'DOM' : '';
              return (
                <div
                  key={partido.id}
                  className={`rounded-lg border p-3 ${partido.estado === 'finalizado' ? 'bg-muted/50' : puedeJugarse ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {horario && (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-1.5 py-0.5 font-mono text-[10px] font-bold">
                          <Clock className="h-2.5 w-2.5" />
                          {diaLabel && `${diaLabel} `}{horario}hs
                        </span>
                      )}
                      {cancha && (
                        <span className="inline-flex items-center rounded bg-accent/10 text-accent-foreground px-1.5 py-0.5 text-[10px] font-semibold">
                          Cancha {cancha}
                        </span>
                      )}
                      <span className="text-xs font-medium text-muted-foreground">
                        {getTipoPartidoLabel(partido.tipo_partido)}
                      </span>
                    </div>
                    {partido.estado === 'finalizado' && (
                      <Badge variant="outline" className="text-xs">Finalizado</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className={`flex-1 ${partido.ganador_id === partido.pareja1_id ? "font-bold text-primary" : ""}`}>
                          {getNombrePareja(partido.pareja1_id)}
                        </span>
                        {partido.estado === 'finalizado' ? (
                          <span className="mx-2 font-mono text-xs bg-muted px-2 py-1 rounded">
                            {partido.set1_pareja1}-{partido.set1_pareja2} / {partido.set2_pareja1}-{partido.set2_pareja2}
                            {partido.set3_pareja1 !== null && ` / ${partido.set3_pareja1}-${partido.set3_pareja2}`}
                          </span>
                        ) : (
                          <span className="mx-2 text-xs text-muted-foreground">vs</span>
                        )}
                        <span className={`flex-1 text-right ${partido.ganador_id === partido.pareja2_id ? "font-bold text-primary" : ""}`}>
                          {getNombrePareja(partido.pareja2_id)}
                        </span>
                      </div>
                    </div>
                    {puedeJugarse && zonaData.estado !== 'finalizada' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setEditingPartido(partido);
                          if (partido.estado === 'finalizado') {
                            setResultado({
                              set1_p1: partido.set1_pareja1?.toString() || "",
                              set1_p2: partido.set1_pareja2?.toString() || "",
                              set2_p1: partido.set2_pareja1?.toString() || "",
                              set2_p2: partido.set2_pareja2?.toString() || "",
                              set3_p1: partido.set3_pareja1?.toString() || "",
                              set3_p2: partido.set3_pareja2?.toString() || "",
                            });
                          }
                        }}
                      >
                        {partido.estado === 'finalizado' ? <Edit className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón cerrar zona */}
        {zonaData.estado !== 'finalizada' && partidosFinalizados === puedenDefinirse && puedenDefinirse > 0 && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleCerrarZona} disabled={saving}>
              <Trophy className="mr-2 h-4 w-4" />
              Cerrar Zona y Pasar a Llaves
            </Button>
          </div>
        )}
      </div>

      {/* Dialog para ingresar resultado */}
      <Dialog open={!!editingPartido} onOpenChange={() => setEditingPartido(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado del Partido</DialogTitle>
            <DialogDescription>
              {editingPartido && (
                <span className="block mt-2">
                  {getNombrePareja(editingPartido.pareja1_id)} vs {getNombrePareja(editingPartido.pareja2_id)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {modalidad?.includes("americano") ? (
                // Modalidad Americano (1 set)
                <div className="grid grid-cols-5 items-center gap-2">
                  <Label className="col-span-1">Games</Label>
                  <Input
                    type="number" min="0" max="25" className="col-span-2" placeholder="P1"
                    value={resultado.set1_p1} onChange={(e) => handleSetChange('set1_p1', e.target.value)}
                  />
                  <Input
                    type="number" min="0" max="25" className="col-span-2" placeholder="P2"
                    value={resultado.set1_p2} onChange={(e) => handleSetChange('set1_p2', e.target.value)}
                  />
                </div>
            ) : (
                <>
                  {/* Set 1 */}
                  <div className="grid grid-cols-5 items-center gap-2">
                    <Label className="col-span-1">Set 1</Label>
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                      value={resultado.set1_p1} onChange={(e) => handleSetChange('set1_p1', e.target.value)}
                    />
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                      value={resultado.set1_p2} onChange={(e) => handleSetChange('set1_p2', e.target.value)}
                    />
                  </div>
                  {/* Set 2 */}
                  <div className="grid grid-cols-5 items-center gap-2">
                    <Label className="col-span-1">Set 2</Label>
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                      value={resultado.set2_p1} onChange={(e) => handleSetChange('set2_p1', e.target.value)}
                    />
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                      value={resultado.set2_p2} onChange={(e) => handleSetChange('set2_p2', e.target.value)}
                    />
                  </div>
                  {/* Set 3 */}
                  <div className="grid grid-cols-5 items-center gap-2">
                    <Label className="col-span-1 text-muted-foreground">
                        {modalidad === '2_sets_6_tiebreak' ? 'Tiebreak' : 'Set 3'}
                    </Label>
                    <Input
                      type="number" min="0" max={modalidad === '2_sets_6_tiebreak' ? 30 : 7} className="col-span-2" placeholder="P1 (opcional)"
                      value={resultado.set3_p1} onChange={(e) => handleSetChange('set3_p1', e.target.value)}
                      disabled={isMatchDecided(resultado)}
                    />
                    <Input
                      type="number" min="0" max={modalidad === '2_sets_6_tiebreak' ? 30 : 7} className="col-span-2" placeholder="P2 (opcional)"
                      value={resultado.set3_p2} onChange={(e) => handleSetChange('set3_p2', e.target.value)}
                      disabled={isMatchDecided(resultado)}
                    />
                  </div>
                </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPartido(null)}>Cancelar</Button>
            <Button onClick={handleSaveResultado} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar Resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empate en zona de 3 */}
      <Dialog open={showTieDialog} onOpenChange={setShowTieDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Empate en zona de 3</DialogTitle>
            <DialogDescription>
              Todas las parejas están empatadas estadísticamente. Elegí cómo definir quién pasa:
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Button variant="default" onClick={() => resolverEmpate("sorteo")} disabled={resolvingTie}>
              {resolvingTie ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Hacer un sorteo para ver quien pasa
            </Button>
            <Button variant="outline" onClick={() => resolverEmpate("tiebreak")} disabled={resolvingTie}>
              {resolvingTie ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Jugar un tiebreak entre las parejas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showDropDialog} onOpenChange={(o) => { if (!o) { setShowDropDialog(false); setDropPairId(null); setDestinosMap({}); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baja de Pareja</DialogTitle>
            <DialogDescription>
              {(() => {
                const target = parejas.find(pp => pp.pareja_torneo_id === dropPairId);
                const nombre = target ? `${target.j1_nombre} ${target.j1_apellido?.charAt(0)}. / ${target.j2_nombre} ${target.j2_apellido?.charAt(0)}.` : "";
                return nombre ? `Se dará de baja: ${nombre}` : "";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {parejas.length === 3 ? (
              <>
                {autoRebalanceCase ? (
                  <div className="p-3 rounded border bg-muted/30 text-sm">
                    Se reestructurará automáticamente: traer una pareja desde una zona de 4 hacia esta zona para que ambas queden en 3. No se permite exceder 4 parejas por zona.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>Acción</Label>
                    <Select value={dropOption} onValueChange={(v: "vacante_final" | "reestructurar" | "organizar_3") => setDropOption(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacante_final">Final entre las dos restantes</SelectItem>
                        <SelectItem value="reestructurar">Reestructurar: mover las restantes a otras zonas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!autoRebalanceCase && dropOption === "reestructurar" && (
                  <div className="grid gap-3">
                    {parejas.filter(pp => pp.pareja_torneo_id !== dropPairId).map(pp => (
                      <div key={pp.pareja_torneo_id} className="grid gap-1">
                        <Label className="text-xs">{pp.j1_nombre} {pp.j1_apellido?.charAt(0)}. / {pp.j2_nombre} {pp.j2_apellido?.charAt(0)}.</Label>
                        <Select
                          value={destinosMap[pp.pareja_torneo_id] || ""}
                          onValueChange={(val) => setDestinosMap(prev => ({ ...prev, [pp.pareja_torneo_id]: val }))}
                        >
                          <SelectTrigger className="h-8"><SelectValue placeholder="Seleccionar zona destino" /></SelectTrigger>
                          <SelectContent>
                            {otherZonasCapaces.map(z => (
                              <SelectItem key={z.id} value={z.id.toString()}>
                                {z.nombre} · {((z as any).parejas_count || 0)}/{torneo.formato_zona}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="p-3 rounded border bg-muted/30 text-sm">
                  Al dar de baja, la zona quedará con 3 parejas y se reorganizarán los partidos y horarios.
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDropDialog(false); setDropPairId(null); setDestinosMap({}); }}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!dropPairId) return;
                setSaving(true);
                try {
                  const body: any = { pareja_id: dropPairId };
                  if (parejas.length === 3) {
                    if (autoRebalanceCase) {
                      body.opcion = "organizar_3";
                    } else {
                      body.opcion = dropOption;
                      if (dropOption === "reestructurar") {
                      const otros = parejas.filter(pp => pp.pareja_torneo_id !== dropPairId);
                      const map: Record<number, number> = {};
                      for (const pp of otros) {
                        const dest = destinosMap[pp.pareja_torneo_id];
                        if (!dest) { toast({ title: "Falta seleccionar destino", description: "Selecciona zona destino para ambas parejas", variant: "destructive" }); setSaving(false); return; }
                        map[pp.pareja_torneo_id] = parseInt(dest);
                      }
                      body.destinos = map;
                      }
                    }
                  } else {
                    body.opcion = "organizar_3";
                  }
                  const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/${zona.id}/baja-pareja`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    toast({ title: "Error", description: err.error || "Error al procesar baja", variant: "destructive" });
                  } else {
                    setShowDropDialog(false);
                    setDropPairId(null);
                    setDestinosMap({});
                    mutate();
                    onUpdate();
                  }
                } catch {
                  toast({ title: "Error", description: "Error al procesar baja", variant: "destructive" });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente Llaves Tab
function LlavesTab({
  llaves,
  onResultadoClick,
  onFinalizarTorneo,
  torneoEstado,
  isSubmitting,
}: {
  llaves: Llave[] | undefined;
  onResultadoClick: (llave: Llave) => void;
  onFinalizarTorneo: () => void;
  torneoEstado: string;
  isSubmitting: boolean;
}) {
  if (!llaves || llaves.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <GitBranch className="mb-4 h-12 w-12 opacity-50" />
          <p>No hay llaves generadas</p>
          <p className="text-sm">Completa todas las zonas para generar las llaves</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por ronda
  const rondasOrder = ["16avos", "8vos", "4tos", "semis", "final"];
  const llavesAgrupadas = rondasOrder
    .filter((ronda) => llaves.some((l) => l.ronda === ronda))
    .map((ronda) => ({
      ronda,
      partidos: llaves.filter((l) => l.ronda === ronda).sort((a, b) => a.posicion - b.posicion),
    }));

  const getRondaLabel = (ronda: string) => {
    const labels: Record<string, string> = {
      "16avos": "16avos de Final",
      "8vos": "Octavos de Final",
      "4tos": "Cuartos de Final",
      semis: "Semifinales",
      final: "Final",
    };
    return labels[ronda] || ronda;
  };

  const finalJugada = llaves.some((l) => l.ronda === 'final' && l.estado === 'finalizado');

  return (
    <>
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/50 dark:bg-black/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          Cuadro de Llaves
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-8 overflow-x-auto pb-4">
          {llavesAgrupadas.map(({ ronda, partidos }) => (
            <div key={ronda} className="min-w-[240px]">
              <h4 className="mb-4 text-center font-medium text-muted-foreground">
                {getRondaLabel(ronda)}
              </h4>
              <div className="flex flex-col justify-around gap-4" style={{ minHeight: `${partidos.length * 100}px` }}>
                {partidos.map((llave) => {
                  const isBye = llave.estado === 'bye';
                  return (
                  <div
                    key={llave.id}
                    onClick={() => !isBye && onResultadoClick(llave)}
                    className={`rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                      isBye ? "border-muted bg-muted/30 opacity-60 cursor-default" :
                      llave.estado === 'finalizado' ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : "bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="space-y-2">
                      <div
                        className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                          !isBye && llave.ganador_id === llave.pareja1_id
                            ? "bg-primary/20 font-bold"
                            : ""
                        }`}
                      >
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          {llave.p1_seed && <span className="inline-flex items-center justify-center rounded bg-muted px-1 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">{llave.p1_seed}</span>}
                          <span className="truncate">{llave.pareja1_id ? (llave.pareja1_jugadores || `Pareja ${llave.pareja1_id}`) : "—"}</span>
                        </span>
                        {llave.estado === 'finalizado' && (
                          <span className="font-mono text-xs shrink-0">
                            {llave.set1_pareja1}/{llave.set2_pareja1}
                            {llave.set3_pareja1 !== null && `/${llave.set3_pareja1}`}
                          </span>
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                          !isBye && llave.ganador_id === llave.pareja2_id
                            ? "bg-primary/20 font-bold"
                            : ""
                        }`}
                      >
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          {isBye ? <span className="italic text-muted-foreground">BYE</span> : <>
                            {llave.p2_seed && <span className="inline-flex items-center justify-center rounded bg-muted px-1 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">{llave.p2_seed}</span>}
                            <span className="truncate">{llave.pareja2_id ? (llave.pareja2_jugadores || `Pareja ${llave.pareja2_id}`) : "—"}</span>
                          </>}
                        </span>
                        {llave.estado === 'finalizado' && (
                          <span className="font-mono text-xs shrink-0">
                            {llave.set1_pareja2}/{llave.set2_pareja2}
                            {llave.set3_pareja2 !== null && `/${llave.set3_pareja2}`}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isBye && llave.pareja1_id && llave.pareja2_id && llave.estado !== 'finalizado' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => onResultadoClick(llave)}
                      >
                        Resultado
                      </Button>
                    )}
                    {llave.estado === 'finalizado' && !isBye && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => onResultadoClick(llave)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Botón Cerrar Torneo */}
    {torneoEstado !== 'finalizada' && finalJugada && (
      <Card className="mt-6 border-primary/50">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold">Torneo listo para cerrar</h3>
            <p className="text-sm text-muted-foreground">
              La final fue jugada. Al cerrar se asignarán los puntos automáticamente a cada jugador/a.
            </p>
          </div>
          <Button onClick={onFinalizarTorneo} disabled={isSubmitting}>
            <Trophy className="mr-2 h-4 w-4" />
            Cerrar Torneo y Asignar Puntos
          </Button>
        </CardContent>
      </Card>
    )}
    </>
  );
}
