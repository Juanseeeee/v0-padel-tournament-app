"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Link as LinkIcon,
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
import { getFriendlyError } from "@/lib/utils";
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
import { BRACKET_CONFIGS, RONDAS_ORDER } from "@/lib/bracket-config";

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
  const [showRegenerateAlert, setShowRegenerateAlert] = useState(false);
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
  const [movingPair, setMovingPair] = useState<{ id: number, zonaId: number, nombre: string } | null>(null);
  const [targetZoneId, setTargetZoneId] = useState<string>("");
  const [targetPairId, setTargetPairId] = useState<string>("");

  const [configDias, setConfigDias] = useState("3");
  const [configTipoZona, setConfigTipoZona] = useState<"grupos_3" | "grupos_4">("grupos_3");
  const [configMinutos, setConfigMinutos] = useState("60");

  // State for adding zone in dialog
  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [newZoneFormat, setNewZoneFormat] = useState("3");
  const [isCreatingZoneLoading, setIsCreatingZoneLoading] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const handleQuickCreateZone = async () => {
    if (!torneo?.categoria_id) return;
    setIsCreatingZoneLoading(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: torneo.categoria_id,
          tipo: parseInt(newZoneFormat) // Maps to 'formato' in the backend
        }),
      });
      if (!res.ok) throw new Error("Error al crear zona");
      const newZone = await res.json();
      
      // Refresh zones list
      await mutateZonas(); 
      
      // Select the new zone
      setAssignZonaId(newZone.id.toString());
      setIsCreatingZone(false);
      toast({ title: "Zona creada", description: `${newZone.nombre} (${newZone.formato} parejas)` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo crear la zona", variant: "destructive" });
    } finally {
      setIsCreatingZoneLoading(false);
    }
  };

  const [resultado, setResultado] = useState({
    set1_p1: "",
    set1_p2: "",
    set2_p1: "",
    set2_p2: "",
    set3_p1: "",
    set3_p2: "",
    set1_tiebreak: "",
    set2_tiebreak: "",
    set3_tiebreak: "",
  });

  // Helper para validar y clampear el valor de games (max dinámico según modalidad)
  const handleSetChange = (field: string, value: string) => {
    // Permitir vacío
    if (value === "") {
      setResultado(prev => ({ ...prev, [field]: "" }));
      return;
    }

    // Para tiebreaks, permitir números y guiones (ej: 7-5)
    if (field.includes('tiebreak')) {
      // Permitir borrar
      if (value === "") {
        setResultado(prev => ({ ...prev, [field]: "" }));
        return;
      }
      // Permitir dígitos y guión
      if (!/^\d*-?\d*$/.test(value)) return;
      setResultado(prev => ({ ...prev, [field]: value }));
      return;
    }

    if (!/^\d+$/.test(value)) return;
    
    let max = 7;
    if (torneo?.modalidad?.includes("americano")) {
        max = 25; // Permitir más games en americano (ej: a 21)
    } else if (torneo?.modalidad === "2_sets_6_tiebreak" && (field === "set3_p1" || field === "set3_p2")) {
        max = 30; // Super tiebreak
    }

    if (parseInt(value) > max) return;

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

  const { data: jugadoresData } = useSWR<{ jugadores: Jugador[] }>("/api/admin/jugadores?limit=1000", fetcher);
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

  const [showConfirmAddPair, setShowConfirmAddPair] = useState(false);

  // ... (other states)

  const executeAddPareja = async () => {
    if (!jugador1Id || !jugador2Id || !torneo?.categoria_id) return;

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

      const data = await res.json();
      if (data.warning) {
        toast({ title: "Pareja creada con advertencia", description: data.warning, variant: "warning" });
      } else {
        toast({ title: "Pareja creada", description: "La pareja se ha inscrito correctamente." });
      }

      mutateParejas();
      if (assignZonaId) {
        mutateZonas();
      }
      setShowConfirmAddPair(false);
      setShowParejaDialog(false);
      resetParejaForm();
    } catch (error) {
      toast({ title: "Error al crear pareja", description: getFriendlyError(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddParejaClick = () => {
    if (!jugador1Id || !jugador2Id || !torneo?.categoria_id) {
      toast({ title: "Datos incompletos", description: "Faltan datos para crear la pareja", variant: "destructive" });
      return;
    }

    // Validar disponibilidad
    if (jugadoresInscritos.has(parseInt(jugador1Id))) {
      const j = jugadores?.find(p => p.id === parseInt(jugador1Id));
      toast({ title: "Jugador no disponible", description: `${j?.nombre} ${j?.apellido} ya está inscrito.`, variant: "destructive" });
      return;
    }
    if (jugadoresInscritos.has(parseInt(jugador2Id))) {
      const j = jugadores?.find(p => p.id === parseInt(jugador2Id));
      toast({ title: "Jugador no disponible", description: `${j?.nombre} ${j?.apellido} ya está inscrito.`, variant: "destructive" });
      return;
    }

    setShowConfirmAddPair(true);
  };

  const handleDeletePareja = async () => {
    if (!parejaToDelete) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/parejas/${parejaToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al eliminar pareja");
      }

      mutateParejas();
      mutateZonas(); // Actualizar zonas por si se regeneraron partidos
      setShowDeleteAlert(false);
      setParejaToDelete(null);
      toast({ title: "Pareja eliminada", description: "La pareja fue eliminada correctamente." });
    } catch (error) {
      toast({ title: "Error al eliminar pareja", description: getFriendlyError(error), variant: "destructive" });
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

  const executeGenerarZonas = async () => {
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
      setShowRegenerateAlert(false);
      toast({ title: "Zonas generadas", description: "Las zonas se han generado correctamente." });
    } catch (error) {
      toast({ title: "Error al generar zonas", description: getFriendlyError(error), variant: "destructive" });
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

    setShowRegenerateAlert(true);
  };

  const handleDeleteZone = async (zonaId: number, zonaNombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la zona ${zonaNombre}? Se eliminarán los partidos y las asignaciones de parejas.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/${zonaId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar zona");
      }

      toast({ title: "Zona eliminada", description: `La zona ${zonaNombre} ha sido eliminada correctamente` });
      mutateZonas();
      // If we were in the dialog and deleted the selected zone, clear the selection
      if (assignZonaId === zonaId.toString()) {
        setAssignZonaId("");
      }
    } catch (error) {
      toast({ title: "Error", description: getFriendlyError(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuardarResultado = async () => {
    if (!selectedPartido) return;

    // Validar formato de tiebreaks
    const isValidTiebreak = (tb: string | undefined | null) => !tb || /^\d+-\d+$/.test(tb);
    if (!isValidTiebreak(resultado.set1_tiebreak) || 
        !isValidTiebreak(resultado.set2_tiebreak) || 
        !isValidTiebreak(resultado.set3_tiebreak)) {
      toast({ title: "Formato incorrecto", description: "Los tiebreaks deben ser 'N-N' (ej: 7-5)", variant: "destructive" });
      return;
    }

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
          set1_tiebreak: resultado.set1_tiebreak || null,
          set2_tiebreak: resultado.set2_tiebreak || null,
          set3_tiebreak: resultado.set3_tiebreak || null,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar resultado");

      mutateZonas();
      setShowResultadoDialog(false);
      setSelectedPartido(null);
      setResultado({ 
        set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "",
        set1_tiebreak: "", set2_tiebreak: "", set3_tiebreak: "" 
      });
    } catch (error) {
      toast({ title: "Error", description: getFriendlyError(error), variant: "destructive" });
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
      toast({ title: "Error al generar llaves", description: getFriendlyError(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminarLlaves = async () => {
    if (!confirm("¿Estás seguro de eliminar las llaves generadas? Se perderán todos los resultados de los partidos de llaves.")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/llaves`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar llaves");
      }

      mutateLlaves();
      toast({ title: "Llaves eliminadas", description: "Las llaves han sido eliminadas correctamente." });
    } catch (error) {
      toast({ title: "Error al eliminar llaves", description: getFriendlyError(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuardarResultadoLlave = async () => {
    if (!selectedLlave) return;

    // Validar formato de tiebreaks
    const isValidTiebreak = (tb: string | undefined | null) => !tb || /^\d+-\d+$/.test(tb);
    if (!isValidTiebreak(resultado.set1_tiebreak) || 
        !isValidTiebreak(resultado.set2_tiebreak) || 
        !isValidTiebreak(resultado.set3_tiebreak)) {
      toast({ title: "Formato incorrecto", description: "Los tiebreaks deben ser 'N-N' (ej: 7-5)", variant: "destructive" });
      return;
    }

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
      setResultado({ 
        set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "",
        set1_tiebreak: "", set2_tiebreak: "", set3_tiebreak: "" 
      });
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
      toast({ title: "Error al finalizar torneo", description: getFriendlyError(error), variant: "destructive" });
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
      toast({ title: "Error al eliminar torneo", description: getFriendlyError(error), variant: "destructive" });
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
      set1_tiebreak: partido.set1_tiebreak || "",
      set2_tiebreak: partido.set2_tiebreak || "",
      set3_tiebreak: partido.set3_tiebreak || "",
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
      set1_tiebreak: llave.set1_tiebreak || "",
      set2_tiebreak: llave.set2_tiebreak || "",
      set3_tiebreak: llave.set3_tiebreak || "",
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
      description={`${(() => {
        const [y, m, d] = String(torneo.fecha_calendario).split("-").map(Number);
        const fechaLocal = new Date(y, (m || 1) - 1, d || 1);
        return fechaLocal.toLocaleDateString("es-AR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      })()} - ${torneo.sede}`}
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
              onDeleteZone={handleDeleteZone}
              modalidad={torneo?.modalidad || "normal"}
              torneoEstado={torneo?.estado}
              formatoZona={torneo?.formato_zona || 4}
            />
          </TabsContent>

          {/* Tab Llaves */}
          <TabsContent value="llaves">
            <LlavesTab
              torneoId={torneoId}
              llaves={llaves}
              onResultadoClick={openLlaveResultadoDialog}
              onFinalizarTorneo={handleFinalizarTorneo}
              onEliminarLlaves={handleEliminarLlaves}
              torneoEstado={torneo?.estado || 'activo'}
              isSubmitting={isSubmitting}
              onLlaveUpdate={mutateLlaves}
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showAllPlayers"
                  checked={showAllPlayers}
                  onChange={(e) => setShowAllPlayers(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="showAllPlayers" className="text-sm text-muted-foreground font-normal">
                  Mostrar todos los jugadores
                </Label>
              </div>
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
                        (showAllPlayers || j.categoria_actual_id === torneo?.categoria_id || 
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
                        (showAllPlayers || j.categoria_actual_id === torneo?.categoria_id || 
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Zona</Label>
                      {!isCreatingZone && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => setIsCreatingZone(true)}
                            title="Nueva Zona"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {assignZonaId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                const z = zonas?.find(z => z.id.toString() === assignZonaId);
                                if (z) handleDeleteZone(z.id, z.nombre);
                              }}
                              title="Eliminar Zona Seleccionada"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {isCreatingZone ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                        <Select value={newZoneFormat} onValueChange={setNewZoneFormat}>
                          <SelectTrigger className="h-9 flex-1">
                            <SelectValue placeholder="Fmt" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 Parejas</SelectItem>
                            <SelectItem value="4">4 Parejas</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 px-3"
                          onClick={handleQuickCreateZone}
                          disabled={isCreatingZoneLoading}
                        >
                          {isCreatingZoneLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 px-3"
                          onClick={() => setIsCreatingZone(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={assignZonaId || ""}
                        onValueChange={(val) => setAssignZonaId(val)}
                        disabled={!zonas || zonas.length === 0}
                      >
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder={(!zonas || zonas.length === 0) ? "Sin zonas disponibles" : "Seleccionar zona"} />
                        </SelectTrigger>
                        <SelectContent>
                          {zonas?.map((z) => {
                            const max = (z as any).formato || torneo.formato_zona || 3;
                            const count = (z as any).parejas_count || 0;
                            const isFull = count >= max;
                            return (
                              <SelectItem key={z.id} value={z.id.toString()} disabled={isFull}>
                                {z.nombre} · {count}/{max} {z.estado === 'finalizada' ? '(cerrada)' : ''} {isFull ? '(Llena)' : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
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
              <Button onClick={handleAddParejaClick} disabled={isSubmitting || !jugador1Id || !jugador2Id}>
                {isSubmitting ? "Guardando..." : "Agregar Pareja"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Add Pair Dialog */}
        <AlertDialog open={showConfirmAddPair} onOpenChange={setShowConfirmAddPair}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar inscripción</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  ¿Estás seguro de inscribir a la siguiente pareja?
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm text-foreground">
                     <p><strong>Jugador 1:</strong> {jugadores?.find(j => j.id.toString() === jugador1Id)?.nombre} {jugadores?.find(j => j.id.toString() === jugador1Id)?.apellido}</p>
                     <p><strong>Jugador 2:</strong> {jugadores?.find(j => j.id.toString() === jugador2Id)?.nombre} {jugadores?.find(j => j.id.toString() === jugador2Id)?.apellido}</p>
                     {assignZonaId && (
                       <p><strong>Zona:</strong> {zonas?.find(z => z.id.toString() === assignZonaId)?.nombre}</p>
                     )}
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={executeAddPareja}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

        <AlertDialog open={showRegenerateAlert} onOpenChange={setShowRegenerateAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className={zonas && zonas.length > 0 ? "text-red-600" : ""}>
                {zonas && zonas.length > 0 ? "¡PELIGRO: Zona Destructiva!" : "¿Generar zonas?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {zonas && zonas.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-bold text-red-600">
                      ADVERTENCIA CRÍTICA: Ya existen zonas generadas en este torneo.
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      <li>Se <strong>ELIMINARÁN</strong> todas las zonas actuales.</li>
                      <li>Se <strong>BORRARÁN</strong> todos los partidos creados.</li>
                      <li>Se <strong>PERDERÁN</strong> todos los resultados y puntajes cargados.</li>
                    </ul>
                    {zonas.some(z => z.estado === 'finalizada') && (
                      <p className="font-bold text-red-700 bg-red-50 p-2 rounded border border-red-200">
                        HAY ZONAS FINALIZADAS. Esta acción destruirá el progreso del torneo.
                      </p>
                    )}
                    <p>Esta acción es irreversible. ¿Estás absolutamente seguro?</p>
                  </div>
                ) : (
                  "¿Estás seguro de generar las zonas para las parejas inscritas?"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={executeGenerarZonas} 
                className={zonas && zonas.length > 0 ? "bg-red-600 hover:bg-red-700 focus:ring-red-600" : ""}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {zonas && zonas.length > 0 ? "Destruyendo y Regenerando..." : "Generando..."}
                  </>
                ) : (
                  zonas && zonas.length > 0 ? "SÍ, ELIMINAR TODO Y REGENERAR" : "Sí, generar"
                )}
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
                    <div className="grid grid-cols-7 items-center gap-2">
                        <Label className="col-span-1">Set 1</Label>
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                        value={resultado.set1_p1} onChange={(e) => handleSetChange('set1_p1', e.target.value)}
                        />
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                        value={resultado.set1_p2} onChange={(e) => handleSetChange('set1_p2', e.target.value)}
                        />
                        <div className="col-span-2 flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase">TB</span>
                            <Input 
                                type="text" 
                                className="h-9" 
                                placeholder="Puntos" 
                                value={resultado.set1_tiebreak || ""} 
                                onChange={(e) => handleSetChange('set1_tiebreak', e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-7 items-center gap-2">
                        <Label className="col-span-1">Set 2</Label>
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                        value={resultado.set2_p1} onChange={(e) => handleSetChange('set2_p1', e.target.value)}
                        />
                        <Input
                        type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                        value={resultado.set2_p2} onChange={(e) => handleSetChange('set2_p2', e.target.value)}
                        />
                        <div className="col-span-2 flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase">TB</span>
                            <Input 
                                type="text" 
                                className="h-9" 
                                placeholder="Puntos" 
                                value={resultado.set2_tiebreak || ""} 
                                onChange={(e) => handleSetChange('set2_tiebreak', e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-7 items-center gap-2">
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
                        <div className="col-span-2 flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase">TB</span>
                            <Input 
                                type="text" 
                                className="h-9" 
                                placeholder="Puntos" 
                                value={resultado.set3_tiebreak || ""} 
                                onChange={(e) => handleSetChange('set3_tiebreak', e.target.value)}
                                disabled={isMatchDecided(resultado) || torneo?.modalidad === '2_sets_6_tiebreak'} 
                            />
                        </div>
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

function PreviewLlavesDialog({
  isOpen,
  onClose,
  totalParejas,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalParejas: number;
}) {
  const config = BRACKET_CONFIGS[totalParejas];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Previsualización de Llaves ({totalParejas} Parejas)</DialogTitle>
          <DialogDescription>
            Estructura estimada basada en la cantidad de parejas.
            {!config && <span className="text-destructive block mt-2">No hay configuración disponible para esta cantidad de parejas.</span>}
          </DialogDescription>
        </DialogHeader>

        {config && (
          <div className="mt-4">
            <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">Distribución de Zonas:</span>{" "}
                {config.zonas.length} zonas ({config.zonas.join(" + ")} parejas)
              </div>
            </div>

            <div className="flex gap-8 overflow-x-auto pb-4">
              {RONDAS_ORDER.map((ronda) => {
                // @ts-ignore
                const partidos = config.bracket.filter((m) => m.ronda === ronda);
                if (partidos.length === 0) return null;

                return (
                  <div key={ronda} className="min-w-[200px]">
                    <h4 className="mb-4 text-center font-medium text-muted-foreground capitalize">
                      {ronda}
                    </h4>
                    <div className="flex flex-col gap-4">
                      {partidos.map((match, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border bg-card p-3 shadow-sm text-xs relative"
                        >
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-[1px] bg-border" />
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center bg-muted/30 p-1 rounded">
                              <span>{match.p1 || "Ganador anterior"}</span>
                            </div>
                            <div className="flex justify-between items-center bg-muted/30 p-1 rounded">
                              <span>{match.p2 || "Ganador anterior"}</span>
                            </div>
                          </div>
                          {match.posicion && (
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary text-primary-foreground text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                              {match.posicion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  onDeleteZone,
  modalidad,
  torneoEstado,
  formatoZona,
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
  onDeleteZone: (id: number, nombre: string) => void;
  modalidad: string;
  torneoEstado?: string;
  formatoZona: number;
}) {
  const [selectedZona, setSelectedZona] = useState<Zona | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [zoneDetails, setZoneDetails] = useState<Record<number, { parejas: ParejaZona[]; partidos: PartidoZona[] }>>({});
  const [draggingPair, setDraggingPair] = useState<number | null>(null);
  const [draggingZoneId, setDraggingZoneId] = useState<number | null>(null);
  const [hoverDropZoneId, setHoverDropZoneId] = useState<number | null>(null);
  const [hoverDropPairId, setHoverDropPairId] = useState<number | null>(null);
  const [showResDialog, setShowResDialog] = useState(false);
  const [resPartido, setResPartido] = useState<PartidoZona | null>(null);
  const [resultadoZ, setResultadoZ] = useState({ 
    set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "",
    set1_tiebreak: "", set2_tiebreak: "", set3_tiebreak: "" 
  });

  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const totalParejas = Object.keys(zoneDetails).length > 0 
    ? Object.values(zoneDetails).reduce((acc, z) => acc + z.parejas.length, 0)
    : zonas?.reduce((acc, z) => acc + ((z as any).parejas_count || 0), 0) || 0;

  const loadZoneDetails = useCallback(async () => {
    if (!zonas || zonas.length === 0) return;
    try {
      const results = await Promise.all(
        zonas.map((z) =>
          fetch(`/api/admin/torneo/${torneoId}/zonas/${z.id}`).then((r) => r.json().catch(() => null))
        )
      );
      const map: Record<number, { parejas: ParejaZona[]; partidos: PartidoZona[] }> = {};
      results.forEach((res, idx) => {
        const zid = zonas[idx].id;
        if (res && res.parejas && res.partidos) {
          map[zid] = { parejas: res.parejas, partidos: res.partidos };
        } else {
          map[zid] = { parejas: [], partidos: [] };
        }
      });
      setZoneDetails(map);
    } catch (e) {
      console.error(e);
    }
  }, [zonas, torneoId]);

  useEffect(() => {
    loadZoneDetails();
  }, [loadZoneDetails]);

  const handleCreateZone = async () => {
    if (!categoriaId) return;
    setIsCreatingZone(true);
    try {
      const res = await fetch(`/api/admin/torneo/${torneoId}/zonas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: categoriaId,
          tipo: formatoZona,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear zona");
      }

      toast({ title: "Zona creada", description: "Se ha creado una nueva zona vacía." });
      onZonaUpdate();
    } catch (error) {
      toast({ title: "Error", description: getFriendlyError(error), variant: "destructive" });
    } finally {
      setIsCreatingZone(false);
    }
  };

  const getResultString = (m: any) => {
    const s1p1 = m.set1_pareja1 ?? m.set1_p1;
    const s1p2 = m.set1_pareja2 ?? m.set1_p2;
    const s2p1 = m.set2_pareja1 ?? m.set2_p1;
    const s2p2 = m.set2_pareja2 ?? m.set2_p2;
    const s3p1 = m.set3_pareja1 ?? m.set3_p1;
    const s3p2 = m.set3_pareja2 ?? m.set3_p2;
    const hasAny = [s1p1, s1p2, s2p1, s2p2, s3p1, s3p2].some((v) => v !== null && v !== undefined);
    if (!hasAny) return null;
    const base = `${s1p1 ?? ""}-${s1p2 ?? ""} / ${s2p1 ?? ""}-${s2p2 ?? ""}`;
    const third = (s3p1 !== null && s3p2 !== null && s3p1 !== undefined && s3p2 !== undefined) ? ` / ${s3p1}-${s3p2}` : "";
    return `${base}${third}`;
  };

  const computeGanadorId = (m: any) => {
    if (m.ganador_id) return m.ganador_id;
    const s1p1 = m.set1_pareja1 ?? m.set1_p1;
    const s1p2 = m.set1_pareja2 ?? m.set1_p2;
    const s2p1 = m.set2_pareja1 ?? m.set2_p1;
    const s2p2 = m.set2_pareja2 ?? m.set2_p2;
    const s3p1 = m.set3_pareja1 ?? m.set3_p1;
    const s3p2 = m.set3_pareja2 ?? m.set3_p2;
    let setsP1 = 0;
    let setsP2 = 0;
    if (s1p1 !== null && s1p1 !== undefined && s1p2 !== null && s1p2 !== undefined) { if (s1p1 > s1p2) setsP1++; else if (s1p2 > s1p1) setsP2++; }
    if (s2p1 !== null && s2p1 !== undefined && s2p2 !== null && s2p2 !== undefined) { if (s2p1 > s2p2) setsP1++; else if (s2p2 > s2p1) setsP2++; }
    if (s3p1 !== null && s3p1 !== undefined && s3p2 !== null && s3p2 !== undefined) { if (s3p1 > s3p2) setsP1++; else if (s3p2 > s3p1) setsP2++; }
    if (setsP1 === 0 && setsP2 === 0) return null;
    return setsP1 > setsP2 ? m.pareja1_id : (setsP2 > setsP1 ? m.pareja2_id : null);
  };

  const computePerdedorId = (m: any) => {
    const gid = computeGanadorId(m);
    if (!gid) return null;
    if (!m.pareja1_id || !m.pareja2_id) return null;
    return gid === m.pareja1_id ? m.pareja2_id : m.pareja1_id;
  };

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
      <div className="space-y-4">
        <div className="flex justify-end">
           <Button onClick={handleCreateZone} disabled={isCreatingZone}>
            {isCreatingZone ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Nueva Zona
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Grid3X3 className="mb-4 h-12 w-12 opacity-50" />
            <p>No hay zonas generadas</p>
            <p className="text-sm">Genera las zonas desde la pestaña de parejas o crea una manualmente</p>
          </CardContent>
        </Card>
      </div>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            {exportingPdf ? "Exportando..." : "Exportar para WhatsApp"}
          </Button>
          <Button onClick={handleCreateZone} disabled={isCreatingZone}>
            {isCreatingZone ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Nueva Zona
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreviewDialog(true)}>
            <GitBranch className="mr-2 h-4 w-4" />
            Previsualizar
          </Button>
          {todasLasZonasFinalizadas && (
            <Button onClick={onGenerarLlaves} disabled={isSubmitting || torneoEstado === 'finalizada'}>
              <GitBranch className="mr-2 h-4 w-4" />
              Generar Llaves
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1">
        {zonas.map((zona) => {
          const pairs = zoneDetails[zona.id]?.parejas || [];
          const maxCapacity = (zona as any).formato || formatoZona || 3;
          const isFull = pairs.length >= maxCapacity;

          return (
          <Card 
            key={zona.id} 
            className={`transition-all hover:scale-[1.02] border-0 shadow-lg hover:shadow-xl backdrop-blur-sm bg-white/50 dark:bg-black/50 relative ${hoverDropZoneId === zona.id ? 'ring-2 ring-primary' : ''}`}
            onDragOver={(e) => {
                e.preventDefault();
                // Visual feedback if full
                if (isFull && draggingPair) {
                    e.dataTransfer.dropEffect = "none"; 
                }
            }}
            onDragEnter={() => setHoverDropZoneId(zona.id)}
            onDragLeave={() => {
               setHoverDropZoneId(null);
            }}
            onDrop={async (e) => {
              const data = e.dataTransfer.getData("text/plain");
              if (!data) return;
              try {
                const parsed = JSON.parse(data);
                const { pareja_torneo_id, zona_origen_id } = parsed;
                if (!pareja_torneo_id || !zona_origen_id || zona_origen_id === zona.id) return;
                
                setHoverDropZoneId(null);
                
                if (isFull) {
                    toast({ 
                        title: "Zona completa", 
                        description: `Esta zona ya tiene ${maxCapacity} parejas.`, 
                        variant: "destructive" 
                    });
                    return;
                }

                const accion = 'mover';

                const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/mover-pareja`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    pareja_torneo_id,
                    zona_origen_id,
                    zona_destino_id: zona.id,
                    pareja_intercambio_id: null,
                    accion,
                  }),
                });
                if (!res.ok) {
                  const err = await res.json();
                  toast({ title: "No se pudo mover la pareja", description: err.error || "Error al mover", variant: "destructive" });
                } else {
                  onZonaUpdate();
                }
              } catch {
                return;
              }
            }}
          >
            <CardHeader className="pb-2">
              {hoverDropZoneId === zona.id && !hoverDropPairId && (
                <div className={`absolute inset-0 ${isFull ? 'bg-red-500/10 border-red-500' : 'bg-primary/5 border-primary'} flex items-center justify-center rounded-lg pointer-events-none z-10 border-2 border-dashed`}>
                    <span className={`px-4 py-2 rounded-full shadow-sm font-medium animate-bounce ${isFull ? 'bg-red-100 text-red-600' : 'bg-background/90 text-primary'}`}>
                        {isFull ? 'Zona Completa' : 'Mover a esta zona'}
                    </span>
                </div>
              )}
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-primary" />
                  {zona.nombre}
                  <Badge variant={isFull ? "destructive" : "outline"} className="ml-2">
                    {pairs.length}/{maxCapacity}
                  </Badge>
                  {(() => {
                    const ps = (zoneDetails[zona.id]?.partidos || []).filter(p => !!p.fecha_hora_programada);
                    if (ps.length === 0) return null;
                    const earliest = ps.reduce((min, cur) => (min.fecha_hora_programada! <= cur.fecha_hora_programada! ? min : cur));
                    const dia = earliest.dia_partido === 'viernes' ? 'Vie' : earliest.dia_partido === 'sabado' ? 'Sáb' : '';
                    const hora = earliest.fecha_hora_programada || '';
                    const cancha = earliest.cancha_numero ? ` C${earliest.cancha_numero}` : '';
                    return <span className="ml-2 text-xs text-muted-foreground">Inicio: {dia} {hora}{cancha}</span>;
                  })()}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={zona.estado === 'finalizada' ? 'default' : 'secondary'}>
                    {zona.estado === 'finalizada' ? 'Cerrada' : 'En juego'}
                  </Badge>
                  {(() => {
                    const ps = (zoneDetails[zona.id]?.partidos || []);
                    const pueden = ps.filter(p => p.pareja1_id && p.pareja2_id).length;
                    const fin = ps.filter(p => p.estado === 'finalizado').length;
                    const canClose = zona.estado !== 'finalizada' && pueden > 0 && fin === pueden;
                    return (
                      <div className="flex gap-2">
                        {canClose && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/${zona.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ estado: 'finalizada' }),
                              });
                              if (res.ok) {
                                onZonaUpdate();
                              } else {
                                toast({ title: "Error", description: "No se pudo cerrar la zona", variant: "destructive" });
                              }
                            }}
                          >
                            Cerrar Zona
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeleteZone(zona.id, zona.nombre)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Arrastrá una pareja entre tarjetas para moverla
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-2">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHoverDropZoneId(zona.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setHoverDropZoneId(null);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHoverDropZoneId(null);
                    const data = e.dataTransfer.getData("text/plain");
                    if (!data) return;
                    try {
                        const parsed = JSON.parse(data);
                        const { pareja_torneo_id, zona_origen_id } = parsed;
                        if (!pareja_torneo_id || !zona_origen_id) return;
                        
                        // Si se suelta en la misma zona pero no sobre una fila, no hacemos nada (o podríamos mover al final)
                        if (zona_origen_id === zona.id) return; 

                        // Intentar mover (si hay lugar) o intercambiar con la última si está llena?
                        // Por ahora, mover simple. Si está llena dará error y el usuario deberá soltar sobre una pareja para intercambiar.
                        // EXCEPTO si la zona está vacía, este es el único lugar donde soltar.
                        
                        const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/mover-pareja`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                            pareja_torneo_id,
                            zona_origen_id,
                            zona_destino_id: zona.id,
                            }),
                        });
                        if (!res.ok) {
                            const err = await res.json();
                            toast({ title: "No se pudo mover", description: err.error, variant: "destructive" });
                        } else {
                            onZonaUpdate();
                            loadZoneDetails();
                        }
                    } catch {}
                  }}
                  className={`rounded-md transition-colors ${hoverDropZoneId === zona.id ? 'bg-muted/50' : ''}`}
                >
                  <h4 className="mb-2 font-semibold text-sm">Parejas</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Pareja</TableHead>
                        <TableHead className="w-32">Partidos</TableHead>
                        <TableHead className="w-24">Sets</TableHead>
                        <TableHead className="w-24">Games</TableHead>
                        <TableHead className="w-20">Puntos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(zoneDetails[zona.id]?.parejas || []).map((p, idx) => (
                        <TableRow key={p.pareja_torneo_id}
                          draggable
                          onDragStart={(e) => {
                            setDraggingPair(p.pareja_torneo_id);
                            setDraggingZoneId(zona.id);
                            e.dataTransfer.effectAllowed = "move";
                            // Store simple data
                            e.dataTransfer.setData("text/plain", JSON.stringify({ 
                                pareja_torneo_id: p.pareja_torneo_id, 
                                zona_origen_id: zona.id 
                            }));
                          }}
                          onDragEnd={() => {
                            setDraggingPair(null);
                            setDraggingZoneId(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggingPair !== p.pareja_torneo_id) {
                                setHoverDropPairId(p.pareja_torneo_id);
                                setHoverDropZoneId(zona.id);
                            }
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Prevent flickering when moving over children
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            if (hoverDropPairId === p.pareja_torneo_id) {
                                setHoverDropPairId(null);
                            }
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHoverDropZoneId(null);
                            setHoverDropPairId(null);
                            
                            const data = e.dataTransfer.getData("text/plain");
                            if (!data) return;
                            try {
                                const parsed = JSON.parse(data);
                                const { pareja_torneo_id, zona_origen_id } = parsed;
                                if (!pareja_torneo_id || !zona_origen_id) return;
                                
                                if (pareja_torneo_id === p.pareja_torneo_id) return;
                        
                                const isSameZone = String(zona_origen_id) === String(zona.id);
                                const accion = 'intercambiar'; // Siempre intercambiar si cae sobre otra pareja
                                
                                const res = await fetch(`/api/admin/torneo/${torneoId}/zonas/mover-pareja`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                    pareja_torneo_id,
                                    zona_origen_id,
                                    zona_destino_id: zona.id,
                                    pareja_intercambio_id: p.pareja_torneo_id,
                                    accion,
                                    }),
                                });
                                if (!res.ok) {
                                    const err = await res.json();
                                    toast({ title: "No se pudo mover la pareja", description: err.error || "Error al mover", variant: "destructive" });
                                } else {
                                    toast({ title: "Movimiento exitoso", description: "La pareja se ha movido correctamente" });
                                    onZonaUpdate();
                                    loadZoneDetails();
                                }
                            } catch (error) {
                                console.error("Drop error:", error);
                                toast({ title: "Error", description: "Ocurrió un error inesperado al mover", variant: "destructive" });
                            }
                          }}
                          className={`cursor-grab active:cursor-grabbing relative group transition-colors duration-200 
                            ${draggingPair === p.pareja_torneo_id ? 'opacity-40 bg-muted/50' : ''} 
                            ${hoverDropPairId === p.pareja_torneo_id && draggingPair && draggingPair !== p.pareja_torneo_id ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}`}
                        >
                          <TableCell>
                            {idx + 1}
                            {hoverDropPairId === p.pareja_torneo_id && draggingPair && draggingPair !== p.pareja_torneo_id && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                    <Badge className="shadow-lg animate-in zoom-in duration-200 text-sm py-1 px-3">
                                      {draggingZoneId === zona.id ? "Intercambiar" : "Intercambiar"}
                                    </Badge>
                                </div>
                            )}
                          </TableCell>
                          <TableCell>{p.j1_nombre} {p.j1_apellido?.charAt(0)}. / {p.j2_nombre} {p.j2_apellido?.charAt(0)}.</TableCell>
                          <TableCell>
                            <span className="text-xs">
                              {(p.partidos_ganados || 0)}G / {(p.partidos_perdidos || 0)}P
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">
                              <span className="text-primary">{(p.sets_ganados || 0)}</span>-<span className="text-destructive">{(p.sets_perdidos || 0)}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {(p.games_ganados || 0)}-{(p.games_perdidos || 0)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              {(p.partidos_ganados || 0)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold text-sm">Partidos</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Dia</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cancha</TableHead>
                        <TableHead>Ganador</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(zoneDetails[zona.id]?.partidos || []).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            {(() => {
                              const len = (zoneDetails[zona.id]?.parejas || []).length;
                              if (len === 4) {
                                if (m.tipo_partido === "inicial_1") return "1 VS 2";
                                if (m.tipo_partido === "inicial_2") return "3 VS 4";
                                if (m.tipo_partido === "perdedores") return "P VS P";
                                if (m.tipo_partido === "ganadores") return "G VS G";
                              } else if (len === 3) {
                                if (m.tipo_partido === "inicial" || m.tipo_partido === "incial" || m.tipo_partido === "inicial_1") return "1 VS 2";
                                if (m.tipo_partido === "perdedor_vs_3" || m.tipo_partido === "perderdor_vs_3" || m.tipo_partido === "perdedores") return "P VS 3";
                                if (m.tipo_partido === "ganador_vs_3" || m.tipo_partido === "ganadores") return "G VS 3";
                              }
                              return m.tipo_partido;
                            })()}
                          </TableCell>
                          <TableCell>
                            <Select
                              key={`${m.id}-${m.dia_partido}`}
                              value={(m.dia_partido as any) || ""}
                              onValueChange={async (val) => {
                                const res = await fetch(`/api/admin/torneo/${torneoId}/partidos/${m.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ dia_partido: val }),
                                });
                                if (res.ok) {
                                  setZoneDetails((prev) => {
                                    const curr = prev[zona.id];
                                    if (!curr) return prev;
                                    return {
                                      ...prev,
                                      [zona.id]: {
                                        parejas: curr.parejas,
                                        partidos: curr.partidos.map((pm) => pm.id === m.id ? { ...pm, dia_partido: val } as any : pm),
                                      },
                                    };
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8"><SelectValue placeholder="Día" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viernes">Viernes</SelectItem>
                                <SelectItem value="sabado">Sábado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              key={`${m.id}-${m.fecha_hora_programada}`}
                              defaultValue={m.fecha_hora_programada || ""}
                              placeholder={m.hora_estimada || "HH:mm"}
                              onBlur={async (e) => {
                                const val = e.target.value;

                                // Validar formato HH:MM
                                if (val && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val)) {
                                  toast({
                                    variant: "destructive",
                                    title: "Formato de hora inválido",
                                    description: "Por favor use el formato HH:MM (ej: 20:00)",
                                  });
                                  e.target.value = m.fecha_hora_programada || ""; // Reset to original value
                                  return;
                                }

                                await fetch(`/api/admin/torneo/${torneoId}/partidos/${m.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ fecha_hora_programada: val }),
                                });
                                setZoneDetails((prev) => {
                                  const curr = prev[zona.id];
                                  if (!curr) return prev;
                                  return {
                                    ...prev,
                                    [zona.id]: {
                                      parejas: curr.parejas,
                                      partidos: curr.partidos.map((pm) => pm.id === m.id ? { ...pm, fecha_hora_programada: val } as any : pm),
                                    },
                                  };
                                });
                              }}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              key={`${m.id}-${m.cancha_numero}`}
                              defaultValue={m.cancha_numero || ""}
                              onBlur={async (e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                await fetch(`/api/admin/torneo/${torneoId}/partidos/${m.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ cancha_numero: val }),
                                });
                                setZoneDetails((prev) => {
                                  const curr = prev[zona.id];
                                  if (!curr) return prev;
                                  return {
                                    ...prev,
                                    [zona.id]: {
                                      parejas: curr.parejas,
                                      partidos: curr.partidos.map((pm) => pm.id === m.id ? { ...pm, cancha_numero: val } as any : pm),
                                    },
                                  };
                                });
                              }}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const gid = computeGanadorId(m);
                              const ps = (zoneDetails[zona.id]?.parejas || []);
                              const w = ps.find(p => p.pareja_torneo_id === gid);
                              if (!gid || !w) return <span className="text-xs text-muted-foreground">—</span>;
                              const lid = computePerdedorId(m);
                              const l = ps.find(p => p.pareja_torneo_id === lid);
                              return (
                                <span className="font-semibold">
                                  <span className="text-primary">
                                    {`${w.j1_nombre} ${w.j1_apellido?.charAt(0)}. / ${w.j2_nombre} ${w.j2_apellido?.charAt(0)}.`}
                                  </span>
                                  {l ? (
                                    <span className="text-muted-foreground"> {" • "} {`${l.j1_nombre} ${l.j1_apellido?.charAt(0)}. / ${l.j2_nombre} ${l.j2_apellido?.charAt(0)}.`}</span>
                                  ) : null}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const r = getResultString(m);
                              return r ? (
                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{r}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">vs</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="default" size="sm" onClick={() => {
                                setResPartido(m);
                                setResultadoZ({
                                  set1_p1: m.set1_pareja1?.toString() || "",
                                  set1_p2: m.set1_pareja2?.toString() || "",
                                  set2_p1: m.set2_pareja1?.toString() || "",
                                  set2_p2: m.set2_pareja2?.toString() || "",
                                  set3_p1: m.set3_pareja1?.toString() || "",
                                  set3_p2: m.set3_pareja2?.toString() || "",
                                  set1_tiebreak: m.set1_tiebreak || "",
                                  set2_tiebreak: m.set2_tiebreak || "",
                                  set3_tiebreak: m.set3_tiebreak || "",
                                });
                                setShowResDialog(true);
                              }}>Resultado</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>

      <Dialog open={showResDialog} onOpenChange={setShowResDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado del Partido</DialogTitle>
            <DialogDescription>
              {resPartido && (
                <span className="block mt-2">
                  {(zoneDetails[resPartido.zona_id!]?.parejas || [])
                    .find(p => p.pareja_torneo_id === resPartido.pareja1_id)
                    ? `${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja1_id)!.j1_nombre} ${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja1_id)!.j1_apellido?.charAt(0)}. / ${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja1_id)!.j2_nombre} ${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja1_id)!.j2_apellido?.charAt(0)}.`
                    : "Pareja 1"}{" "}
                  vs{" "}
                  {(zoneDetails[resPartido.zona_id!]?.parejas || [])
                    .find(p => p.pareja_torneo_id === resPartido.pareja2_id)
                    ? `${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja2_id)!.j1_nombre} ${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja2_id)!.j1_apellido?.charAt(0)}. / ${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja2_id)!.j2_nombre} ${(zoneDetails[resPartido.zona_id!]?.parejas || []).find(p => p.pareja_torneo_id === resPartido.pareja2_id)!.j2_apellido?.charAt(0)}.`
                    : "Pareja 2"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {modalidad?.includes("americano") ? (
              <div className="grid grid-cols-5 items-center gap-2">
                <Label className="col-span-1">Games</Label>
                <Input type="number" min="0" max="25" className="col-span-2" placeholder="P1" value={resultadoZ.set1_p1} onChange={(e) => {
                  const v = e.target.value;
                  if (v !== "" && !/^\d+$/.test(v)) return;
                  if (v !== "" && parseInt(v) > 25) return;
                  setResultadoZ(prev => ({ ...prev, set1_p1: v }));
                }} />
                <Input type="number" min="0" max="25" className="col-span-2" placeholder="P2" value={resultadoZ.set1_p2} onChange={(e) => {
                  const v = e.target.value;
                  if (v !== "" && !/^\d+$/.test(v)) return;
                  if (v !== "" && parseInt(v) > 25) return;
                  setResultadoZ(prev => ({ ...prev, set1_p2: v }));
                }} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 items-center gap-2">
                  <Label className="col-span-1">Set 1</Label>
                  <Input type="number" min="0" max="7" className="col-span-2" placeholder="P1" value={resultadoZ.set1_p1} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+$/.test(v)) return;
                    if (v !== "" && parseInt(v) > 7) return;
                    setResultadoZ(prev => ({ ...prev, set1_p1: v }));
                  }} />
                  <Input type="number" min="0" max="7" className="col-span-2" placeholder="P2" value={resultadoZ.set1_p2} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+$/.test(v)) return;
                    if (v !== "" && parseInt(v) > 7) return;
                    setResultadoZ(prev => ({ ...prev, set1_p2: v }));
                  }} />
                  <Input className="col-span-2" placeholder="TB" value={resultadoZ.set1_tiebreak || ""} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d*-?\d*$/.test(v)) return;
                    setResultadoZ(prev => ({ ...prev, set1_tiebreak: v }));
                  }} />
                </div>
                <div className="grid grid-cols-7 items-center gap-2">
                  <Label className="col-span-1">Set 2</Label>
                  <Input type="number" min="0" max="7" className="col-span-2" placeholder="P1" value={resultadoZ.set2_p1} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+$/.test(v)) return;
                    if (v !== "" && parseInt(v) > 7) return;
                    setResultadoZ(prev => ({ ...prev, set2_p1: v }));
                  }} />
                  <Input type="number" min="0" max="7" className="col-span-2" placeholder="P2" value={resultadoZ.set2_p2} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+$/.test(v)) return;
                    if (v !== "" && parseInt(v) > 7) return;
                    setResultadoZ(prev => ({ ...prev, set2_p2: v }));
                  }} />
                  <Input className="col-span-2" placeholder="TB" value={resultadoZ.set2_tiebreak || ""} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d*-?\d*$/.test(v)) return;
                    setResultadoZ(prev => ({ ...prev, set2_tiebreak: v }));
                  }} />
                </div>
                <div className="grid grid-cols-7 items-center gap-2">
                  <Label className="col-span-1 text-muted-foreground">{modalidad === '2_sets_6_tiebreak' ? 'Tiebreak' : 'Set 3'}</Label>
                  <Input type="number" min="0" max={modalidad === '2_sets_6_tiebreak' ? 30 : 7} className="col-span-2" placeholder="P1" value={resultadoZ.set3_p1} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+$/.test(v)) return;
                    if (v !== "" && parseInt(v) > (modalidad === '2_sets_6_tiebreak' ? 30 : 7)) return;
                    setResultadoZ(prev => ({ ...prev, set3_p1: v }));
                  }} disabled={isMatchDecided(resultadoZ)} />
                  <Input type="number" min="0" max={modalidad === '2_sets_6_tiebreak' ? 30 : 7} className="col-span-2" placeholder="P2" value={resultadoZ.set3_p2} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+$/.test(v)) return;
                    if (v !== "" && parseInt(v) > (modalidad === '2_sets_6_tiebreak' ? 30 : 7)) return;
                    setResultadoZ(prev => ({ ...prev, set3_p2: v }));
                  }} disabled={isMatchDecided(resultadoZ)} />
                  <Input className="col-span-2" placeholder="TB" value={resultadoZ.set3_tiebreak || ""} onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d*-?\d*$/.test(v)) return;
                    setResultadoZ(prev => ({ ...prev, set3_tiebreak: v }));
                  }} disabled={isMatchDecided(resultadoZ) || modalidad === '2_sets_6_tiebreak'} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!resPartido) return;
              const isValidTiebreak = (tb: string | undefined | null) => !tb || /^\d+-\d+$/.test(tb);
              if (!isValidTiebreak(resultadoZ.set1_tiebreak) || 
                  !isValidTiebreak(resultadoZ.set2_tiebreak) || 
                  !isValidTiebreak(resultadoZ.set3_tiebreak)) {
                toast({ title: "Formato incorrecto", description: "Los tiebreaks deben ser 'N-N' (ej: 7-5)", variant: "destructive" });
                return;
              }
              const body = {
                set1_p1: resultadoZ.set1_p1 ? parseInt(resultadoZ.set1_p1) : null,
                set1_p2: resultadoZ.set1_p2 ? parseInt(resultadoZ.set1_p2) : null,
                set2_p1: resultadoZ.set2_p1 ? parseInt(resultadoZ.set2_p1) : null,
                set2_p2: resultadoZ.set2_p2 ? parseInt(resultadoZ.set2_p2) : null,
                set3_p1: resultadoZ.set3_p1 ? parseInt(resultadoZ.set3_p1) : null,
                set3_p2: resultadoZ.set3_p2 ? parseInt(resultadoZ.set3_p2) : null,
                set1_tiebreak: resultadoZ.set1_tiebreak || null,
                set2_tiebreak: resultadoZ.set2_tiebreak || null,
                set3_tiebreak: resultadoZ.set3_tiebreak || null,
              };
              const res = await fetch(`/api/admin/torneo/${torneoId}/partidos/${resPartido.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (res.ok) {
                // Optimistic UI update: reflejar resultado y ganador en zoneDetails
                setZoneDetails((prev) => {
                  const curr = prev[resPartido.zona_id!];
                  if (!curr) return prev;
                  // Calcular ganador localmente
                  let setsP1 = 0; let setsP2 = 0;
                  const s1p1 = body.set1_p1, s1p2 = body.set1_p2;
                  const s2p1 = body.set2_p1, s2p2 = body.set2_p2;
                  const s3p1 = body.set3_p1, s3p2 = body.set3_p2;
                  if (s1p1 !== null && s1p2 !== null) { if (s1p1 > s1p2) setsP1++; else if (s1p2 > s1p1) setsP2++; }
                  if (s2p1 !== null && s2p2 !== null) { if (s2p1 > s2p2) setsP1++; else if (s2p2 > s2p1) setsP2++; }
                  if (s3p1 !== null && s3p2 !== null) { if (s3p1 > s3p2) setsP1++; else if (s3p2 > s3p1) setsP2++; }
                  const ganador_id = setsP1 > setsP2 ? resPartido.pareja1_id : (setsP2 > setsP1 ? resPartido.pareja2_id : null);
                  return {
                    ...prev,
                    [resPartido.zona_id!]: {
                      parejas: curr.parejas,
                      partidos: curr.partidos.map((pm) =>
                        pm.id === resPartido.id
                          ? {
                              ...pm,
                              set1_pareja1: s1p1,
                              set1_pareja2: s1p2,
                              set2_pareja1: s2p1,
                              set2_pareja2: s2p2,
                              set3_pareja1: s3p1,
                              set3_pareja2: s3p2,
                              set1_tiebreak: body.set1_tiebreak,
                              set2_tiebreak: body.set2_tiebreak,
                              set3_tiebreak: body.set3_tiebreak,
                              ganador_id,
                              estado: ganador_id ? 'finalizado' : 'pendiente',
                            } as any
                          : pm
                      ),
                    },
                  };
                });
                setShowResDialog(false);
                setResPartido(null);
                setResultadoZ({ set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "", set1_tiebreak: "", set2_tiebreak: "", set3_tiebreak: "" });
                // Refrescar desde server para asegurar consistencia
                loadZoneDetails();
              } else {
                toast({ title: "Error", description: getFriendlyError("No se pudo guardar el resultado"), variant: "destructive" });
              }
            }}>Guardar Resultado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              formatoZona={formatoZona}
            />
          )}
        </DialogContent>
      </Dialog>
      <PreviewLlavesDialog
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        totalParejas={totalParejas}
      />
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
  formatoZona,
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
  formatoZona: number;
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
    set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "",
    set1_tiebreak: "", set2_tiebreak: "", set3_tiebreak: ""
  });
  const [dropPairId, setDropPairId] = useState<number | null>(null);
  const [showDropDialog, setShowDropDialog] = useState(false);
  const [dropOption, setDropOption] = useState<"vacante_final" | "reestructurar" | "organizar_3" | "traer_de_zona_4">("vacante_final");
  const [destinosMap, setDestinosMap] = useState<Record<number, string>>({});
  const [traerZonaId, setTraerZonaId] = useState<string>("");
  const [traerZonaPairs, setTraerZonaPairs] = useState<ParejaZona[]>([]);
  const [traerParejaId, setTraerParejaId] = useState<string>("");

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
  
  // Fetch pairs for selected zona de 4 to bring from
  useEffect(() => {
    if (!traerZonaId) {
      setTraerZonaPairs([]);
      setTraerParejaId("");
      return;
    }
    fetch(`/api/admin/torneo/${torneoId}/zonas/${traerZonaId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.parejas) {
          setTraerZonaPairs(data.parejas);
        }
      })
      .catch(console.error);
  }, [traerZonaId, torneoId]);

  const handleSetChange = (field: string, value: string) => {
    // Permitir vacío
    if (value === "") {
        setResultado(prev => ({ ...prev, [field]: "" }));
        return;
    }

    // Para tiebreaks, permitir números y guiones (ej: 7-5)
    if (field.includes('tiebreak')) {
        if (!/^\d*-?\d*$/.test(value)) return;
        setResultado(prev => ({ ...prev, [field]: value }));
        return;
    }

    if (!/^\d+$/.test(value)) return;
    
    let max = 7;
    if (modalidad?.includes("americano")) {
        max = 25; // Permitir más games en americano (ej: a 21)
    } else if (modalidad === "2_sets_6_tiebreak" && (field === "set3_p1" || field === "set3_p2")) {
        max = 30; // Super tiebreak
    }

    if (parseInt(value) > max) return;

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

  // Ordenar parejas por lógica específica si es zona de 4 semifinales
  const getParejasOrdenadas = () => {
    const normalize = (s: string) => s?.trim().toLowerCase() || "";

    // Detectar si es zona de 4 con formato semifinales
    const isZona4Semis = partidos.some(p => {
        const t = normalize(p.tipo_partido);
        return t === 'inicial_1' || t === 'ganadores' || t === 'perdedores';
    });
    
    if (isZona4Semis) {
      const finalGanadores = partidos.find(p => normalize(p.tipo_partido) === 'ganadores');
      const finalPerdedores = partidos.find(p => normalize(p.tipo_partido) === 'perdedores');
      
      // Identificar roles exactos
      let campeonId: string | null = null;
      let subcampeonId: string | null = null;
      let terceroId: string | null = null;
      let cuartoId: string | null = null;

      // 1. Analizar Final (Ganadores)
      if (finalGanadores) {
          if (finalGanadores.estado === 'finalizado' && finalGanadores.ganador_id) {
              campeonId = String(finalGanadores.ganador_id);
              subcampeonId = String(finalGanadores.ganador_id === finalGanadores.pareja1_id ? finalGanadores.pareja2_id : finalGanadores.pareja1_id);
          }
      }

      // 2. Analizar 3er Puesto (Perdedores)
      if (finalPerdedores) {
          if (finalPerdedores.estado === 'finalizado' && finalPerdedores.ganador_id) {
              terceroId = String(finalPerdedores.ganador_id);
              cuartoId = String(finalPerdedores.ganador_id === finalPerdedores.pareja1_id ? finalPerdedores.pareja2_id : finalPerdedores.pareja1_id);
          }
      }

      // 3. Identificar Finalistas (para cuando no hay campeón aún)
      const finalistas = new Set<string>();
      if (finalGanadores) {
          if (finalGanadores.pareja1_id) finalistas.add(String(finalGanadores.pareja1_id));
          if (finalGanadores.pareja2_id) finalistas.add(String(finalGanadores.pareja2_id));
      }
      
      // Fallback: si finalGanadores no tiene parejas, buscar ganadores de semis
      if (finalistas.size < 2) {
        partidos.forEach(p => {
          const t = normalize(p.tipo_partido);
          if ((t === 'inicial_1' || t === 'inicial_2') && p.estado === 'finalizado' && p.ganador_id) {
             finalistas.add(String(p.ganador_id));
          }
        });
      }
      
      return [...parejas].sort((a, b) => {
        const idA = String(a.pareja_torneo_id);
        const idB = String(b.pareja_torneo_id);
        
        // 1. Campeón siempre primero
        if (campeonId) {
            if (idA === campeonId) return -1;
            if (idB === campeonId) return 1;
        }

        // 2. Subcampeón siempre segundo
        if (subcampeonId) {
            if (idA === subcampeonId) return -1;
            if (idB === subcampeonId) return 1;
        }

        // 3. Finalistas (si no hay campeón definido aún) van antes que el resto
        const isFinalistaA = finalistas.has(idA);
        const isFinalistaB = finalistas.has(idB);
        
        if (isFinalistaA && !isFinalistaB) return -1;
        if (!isFinalistaA && isFinalistaB) return 1;
        
        // 4. Tercero siempre tercero
        if (terceroId) {
            if (idA === terceroId) return -1;
            if (idB === terceroId) return 1;
        }
        
        // 5. Cuarto siempre cuarto
        if (cuartoId) {
            if (idA === cuartoId) return -1;
            if (idB === cuartoId) return 1;
        }

        // 6. Fallback a puntos/sets si no hay definición por estructura
        const puntosA = a.partidos_ganados || 0;
        const puntosB = b.partidos_ganados || 0;
        if (puntosB !== puntosA) return puntosB - puntosA;
        const diffA = (a.sets_ganados || 0) - (a.sets_perdidos || 0);
        const diffB = (b.sets_ganados || 0) - (b.sets_perdidos || 0);
        if (diffB !== diffA) return diffB - diffA;
        return (b.sets_ganados || 0) - (a.sets_ganados || 0);
      });
    }

    // Default sorting
    return [...parejas].sort((a, b) => {
      const puntosA = a.partidos_ganados || 0;
      const puntosB = b.partidos_ganados || 0;
      if (puntosB !== puntosA) return puntosB - puntosA;
      const diffA = (a.sets_ganados || 0) - (a.sets_perdidos || 0);
      const diffB = (b.sets_ganados || 0) - (b.sets_perdidos || 0);
      if (diffB !== diffA) return diffB - diffA;
      return (b.sets_ganados || 0) - (a.sets_ganados || 0);
    });
  };

  const parejasOrdenadas = getParejasOrdenadas();

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

    const isValidTiebreak = (tb: string | undefined | null) => !tb || /^\d+-\d+$/.test(tb);
    if (!isValidTiebreak(resultado.set1_tiebreak) || 
        !isValidTiebreak(resultado.set2_tiebreak) || 
        !isValidTiebreak(resultado.set3_tiebreak)) {
      toast({ title: "Formato incorrecto", description: "Los tiebreaks deben ser 'N-N' (ej: 7-5)", variant: "destructive" });
      return;
    }

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
        setResultado({ 
          set1_p1: "", set1_p2: "", set2_p1: "", set2_p2: "", set3_p1: "", set3_p2: "",
          set1_tiebreak: "", set2_tiebreak: "", set3_tiebreak: "" 
        });
        mutate();
        onUpdate();
      } else {
        toast({ title: "Error", description: getFriendlyError("No se pudo guardar el resultado"), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: getFriendlyError(error), variant: "destructive" });
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
        toast({ title: "Error", description: getFriendlyError("No se pudo cerrar la zona"), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: getFriendlyError(error), variant: "destructive" });
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
        toast({ title: "Error al resolver empate", description: getFriendlyError(data.error || "No se pudo resolver el empate"), variant: "destructive" });
        return;
      }
      setShowTieDialog(false);
      mutate();
      onUpdate();
      if (metodo === "sorteo") onClose();
    } catch (error) {
      toast({ title: "Error", description: getFriendlyError(error), variant: "destructive" });
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
        toast({ title: "Error al mover pareja", description: getFriendlyError(err.error || "No se pudo mover la pareja"), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: getFriendlyError(error), variant: "destructive" });
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
  const otherZonasCapaces = otherZonas.filter(z => (((z as any).parejas_count || 0) < formatoZona));
  const hasZona4Disponible = otherZonas.some(z => ((z as any).parejas_count || 0) === 4);
  const zonasDe4 = otherZonas.filter(z => ((z as any).parejas_count || 0) === 4);
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
                            {getResultString(partido)}
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
                          setResultado({
                            set1_p1: partido.set1_pareja1?.toString() || "",
                            set1_p2: partido.set1_pareja2?.toString() || "",
                            set2_p1: partido.set2_pareja1?.toString() || "",
                            set2_p2: partido.set2_pareja2?.toString() || "",
                            set3_p1: partido.set3_pareja1?.toString() || "",
                            set3_p2: partido.set3_pareja2?.toString() || "",
                            set1_tiebreak: partido.set1_tiebreak || "",
                            set2_tiebreak: partido.set2_tiebreak || "",
                            set3_tiebreak: partido.set3_tiebreak || "",
                          });
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
                  <div className="grid grid-cols-7 items-center gap-2">
                    <Label className="col-span-1">Set 1</Label>
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                      value={resultado.set1_p1} onChange={(e) => handleSetChange('set1_p1', e.target.value)}
                    />
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                      value={resultado.set1_p2} onChange={(e) => handleSetChange('set1_p2', e.target.value)}
                    />
                    <div className="col-span-2 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase">TB</span>
                        <Input 
                            type="text" 
                            className="h-9" 
                            placeholder="Puntos" 
                            value={resultado.set1_tiebreak || ""} 
                            onChange={(e) => handleSetChange('set1_tiebreak', e.target.value)} 
                        />
                    </div>
                  </div>
                  {/* Set 2 */}
                  <div className="grid grid-cols-7 items-center gap-2">
                    <Label className="col-span-1">Set 2</Label>
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P1"
                      value={resultado.set2_p1} onChange={(e) => handleSetChange('set2_p1', e.target.value)}
                    />
                    <Input
                      type="number" min="0" max="7" className="col-span-2" placeholder="P2"
                      value={resultado.set2_p2} onChange={(e) => handleSetChange('set2_p2', e.target.value)}
                    />
                    <div className="col-span-2 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase">TB</span>
                        <Input 
                            type="text" 
                            className="h-9" 
                            placeholder="Puntos" 
                            value={resultado.set2_tiebreak || ""} 
                            onChange={(e) => handleSetChange('set2_tiebreak', e.target.value)} 
                        />
                    </div>
                  </div>
                  {/* Set 3 */}
                  <div className="grid grid-cols-7 items-center gap-2">
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
                    <div className="col-span-2 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase">TB</span>
                        <Input 
                            type="text" 
                            className="h-9" 
                            placeholder="Puntos" 
                            value={resultado.set3_tiebreak || ""} 
                            onChange={(e) => handleSetChange('set3_tiebreak', e.target.value)}
                            disabled={isMatchDecided(resultado) || modalidad === '2_sets_6_tiebreak'} 
                        />
                    </div>
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
                  <>
                    <div className="grid gap-2">
                      <Label>Acción</Label>
                      <Select value={dropOption} onValueChange={(v: "vacante_final" | "reestructurar" | "organizar_3" | "traer_de_zona_4") => setDropOption(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacante_final">Final entre las dos restantes</SelectItem>
                          <SelectItem value="reestructurar">Reestructurar: mover las restantes a otras zonas</SelectItem>
                          <SelectItem value="traer_de_zona_4">Traer una pareja de la zona de 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {dropOption === "traer_de_zona_4" && (
                      <div className="p-3 rounded border bg-muted/30 text-sm">
                        Se traerá una pareja desde una zona de 4 para que ambas queden en 3. No se exceden 4 parejas por zona.
                      </div>
                    )}
                    {dropOption === "traer_de_zona_4" && (
                      <div className="grid gap-3 mt-2">
                        <div className="grid gap-2">
                          <Label>Zona de 4 (origen)</Label>
                          <Select value={traerZonaId} onValueChange={setTraerZonaId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar zona de 4" /></SelectTrigger>
                            <SelectContent>
                              {zonasDe4.map(z => (
                                <SelectItem key={z.id} value={z.id.toString()}>
                                  {z.nombre} · {((z as any).parejas_count || 0)}/4
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {traerZonaId && (
                          <div className="grid gap-2">
                            <Label>Pareja a traer</Label>
                            <Select value={traerParejaId} onValueChange={setTraerParejaId}>
                              <SelectTrigger><SelectValue placeholder="Seleccionar pareja" /></SelectTrigger>
                              <SelectContent>
                                {traerZonaPairs.map(pp => (
                                  <SelectItem key={pp.pareja_torneo_id} value={pp.pareja_torneo_id.toString()}>
                                    {pp.j1_nombre} {pp.j1_apellido?.charAt(0)}. / {pp.j2_nombre} {pp.j2_apellido?.charAt(0)}.
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </>
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
                                {z.nombre} · {((z as any).parejas_count || 0)}/{formatoZona}
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
                      if (dropOption === "traer_de_zona_4") {
                        body.opcion = "organizar_3";
                        if (!traerZonaId || !traerParejaId) {
                          toast({ title: "Selecciona zona y pareja", description: "Elegí la zona de 4 y la pareja a traer", variant: "destructive" });
                          setSaving(false);
                          return;
                        }
                        body.traer_zona_id = parseInt(traerZonaId);
                        body.traer_pareja_id = parseInt(traerParejaId);
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
  torneoId,
  llaves,
  onResultadoClick,
  onFinalizarTorneo,
  onEliminarLlaves,
  torneoEstado,
  isSubmitting,
  onLlaveUpdate,
}: {
  torneoId: string;
  llaves: Llave[] | undefined;
  onResultadoClick: (llave: Llave) => void;
  onFinalizarTorneo: () => void;
  onEliminarLlaves: () => void;
  torneoEstado: string;
  isSubmitting: boolean;
  onLlaveUpdate: () => void;
}) {
  const [draggingPairId, setDraggingPairId] = useState<number | null>(null);
  const [draggingLlaveId, setDraggingLlaveId] = useState<number | null>(null);
  const [draggingRonda, setDraggingRonda] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<'pareja' | 'connection' | null>(null);
  const [hoverDropLlaveId, setHoverDropLlaveId] = useState<number | null>(null);
  const [hoverDropPos, setHoverDropPos] = useState<'p1' | 'p2' | null>(null);
  const [hoverInvalidLlaveId, setHoverInvalidLlaveId] = useState<number | null>(null);
  const [hoverInvalidPos, setHoverInvalidPos] = useState<'p1' | 'p2' | null>(null);

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    const updateLines = () => {
        if (!llaves || !containerRef.current) return;
        const newLines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        llaves.forEach(source => {
            if (source.siguiente_llave_id && cardRefs.current[source.id] && cardRefs.current[source.siguiente_llave_id]) {
                const sourceEl = cardRefs.current[source.id];
                const targetEl = cardRefs.current[source.siguiente_llave_id];
                
                if (sourceEl && targetEl) {
                    const sourceRect = sourceEl.getBoundingClientRect();
                    const targetRect = targetEl.getBoundingClientRect();
                    
                    // From right of source
                    const x1 = (sourceRect.right - containerRect.left) + scrollLeft;
                    const y1 = (sourceRect.top + sourceRect.height / 2 - containerRect.top) + scrollTop;
                    
                    // To left of target
                    const x2 = (targetRect.left - containerRect.left) + scrollLeft;
                    const y2 = (targetRect.top + targetRect.height / 2 - containerRect.top) + scrollTop;
                    
                    newLines.push({
                        id: `${source.id}-${source.siguiente_llave_id}`,
                        x1, y1, x2, y2
                    });
                }
            }
        });
        setLines(newLines);
    };

    // Wait for layout
    const timeout = setTimeout(updateLines, 100);
    window.addEventListener('resize', updateLines);
    const container = containerRef.current;
    if (container) {
        container.addEventListener('scroll', updateLines);
    }
    return () => {
        window.removeEventListener('resize', updateLines);
        if (container) {
            container.removeEventListener('scroll', updateLines);
        }
        clearTimeout(timeout);
    };
  }, [llaves]);

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
  // Utilizar RONDAS_ORDER importado, pero nos aseguramos que "final" esté al final si no lo está.
  // En bracket-config.ts: ['32avos', '16avos', '8vos', '4tos', 'semis', 'final']

  const getSortKey = (llave: Llave) => {
    if (llave.siguiente_llave_id && llave.siguiente_llave_slot) {
        // Find target match
        const target = llaves.find(l => l.id === llave.siguiente_llave_id);
        if (target) {
             return (target.posicion * 10) + llave.siguiente_llave_slot;
        }
    }
    return llave.posicion * 100;
  };

  const llavesAgrupadas = RONDAS_ORDER
    .filter((ronda) => llaves.some((l) => l.ronda === ronda))
    .map((ronda) => ({
      ronda,
      partidos: llaves
        .filter((l) => l.ronda === ronda)
        .sort((a, b) => getSortKey(a) - getSortKey(b)),
    }));

  const getRondaLabel = (ronda: string) => {
    const labels: Record<string, string> = {
      "32avos": "32avos de Final",
      "16avos": "16avos de Final",
      "8vos": "Octavos de Final",
      "4tos": "Cuartos de Final",
      semis: "Semifinales",
      final: "Final",
    };
    return labels[ronda] || ronda;
  };

          const getTargetMatchInfo = (targetId: number | null | undefined) => {
            if (!targetId) return null;
            const target = llaves.find(l => l.id === targetId);
            if (!target) return null;
            return {
              ronda: target.ronda,
              posicion: target.posicion
            };
          };

          const finalJugada = llaves.some((l) => l.ronda === 'final' && l.estado === 'finalizado');

  // Helper to check if a round allows outgoing connections (all except final)
  const canDragConnection = (ronda: string) => {
      const idx = RONDAS_ORDER.indexOf(ronda);
      return idx !== -1 && idx < RONDAS_ORDER.length - 1; // Not the last one
  };

  // Helper to check if connection is valid (consecutive rounds)
  const isValidConnection = (sourceRonda: string, targetRonda: string) => {
      const sourceIdx = RONDAS_ORDER.indexOf(sourceRonda);
      const targetIdx = RONDAS_ORDER.indexOf(targetRonda);
      return sourceIdx !== -1 && targetIdx !== -1 && targetIdx === sourceIdx + 1;
  };

  const handleDragStart = (e: React.DragEvent, parejaId: number, llaveId: number, ronda: string) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'pareja', parejaId, llaveId, ronda }));
    setDraggingPairId(parejaId);
    setDraggingLlaveId(llaveId);
    setDraggingRonda(ronda);
    setDraggingType('pareja');
  };

  const handleConnectionDragStart = (e: React.DragEvent, llave: Llave) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'connection', llaveId: llave.id, ronda: llave.ronda }));
    setDraggingLlaveId(llave.id);
    setDraggingRonda(llave.ronda);
    setDraggingType('connection');
  };

  const handleDragOver = (e: React.DragEvent, targetLlave: Llave, pos: 'p1' | 'p2') => {
    e.preventDefault();
    if (!draggingRonda || !draggingType) return;
    
    // Strict Validations based on type
    let isValid = false;

    if (draggingType === 'pareja') {
        if (draggingRonda === targetLlave.ronda && targetLlave.estado !== 'finalizado') {
            isValid = true;
        }
    } else if (draggingType === 'connection') {
        // Can only drag to next round
        if (isValidConnection(draggingRonda, targetLlave.ronda) && targetLlave.estado !== 'finalizado') {
            isValid = true;
        }
    }

    if (!isValid) {
        setHoverInvalidLlaveId(targetLlave.id);
        setHoverInvalidPos(pos);
        setHoverDropLlaveId(null);
        setHoverDropPos(null);
        return;
    }
    
    setHoverDropLlaveId(targetLlave.id);
    setHoverDropPos(pos);
    setHoverInvalidLlaveId(null);
    setHoverInvalidPos(null);
  };

  const handleDragLeave = () => {
    setHoverDropLlaveId(null);
    setHoverDropPos(null);
    setHoverInvalidLlaveId(null);
    setHoverInvalidPos(null);
  };

  const handleDrop = async (e: React.DragEvent, targetLlave: Llave, pos: 'p1' | 'p2') => {
    e.preventDefault();
    setHoverDropLlaveId(null);
    setHoverDropPos(null);
    setHoverInvalidLlaveId(null);
    setHoverInvalidPos(null);
    
    const dataStr = e.dataTransfer.getData("text/plain");
    if (!dataStr) return;
    
    try {
        const data = JSON.parse(dataStr);
        const { type } = data;

        if (type === 'pareja') {
            const { parejaId, llaveId, ronda } = data;
            
            if (ronda !== targetLlave.ronda) {
                toast({ title: "Movimiento inválido", description: getFriendlyError("No se pueden mover parejas entre diferentes fases"), variant: "destructive" });
                return;
            }
            
            if (targetLlave.estado === 'finalizado') {
                toast({ title: "Acción denegada", description: getFriendlyError("No se pueden modificar partidos ya jugados"), variant: "destructive" });
                return;
            }

            const res = await fetch(`/api/admin/torneo/${torneoId}/llaves/mover-pareja`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pareja_id: parejaId,
                    llave_origen_id: llaveId,
                    llave_destino_id: targetLlave.id,
                    posicion_destino: pos
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                toast({ title: "Error al mover pareja", description: getFriendlyError(err.error || "Error al mover pareja"), variant: "destructive" });
            } else {
                onLlaveUpdate();
                toast({ title: "Pareja movida", description: "Se actualizó el cuadro correctamente" });
            }
        } else if (type === 'connection') {
            const { llaveId, ronda } = data;
            
            if (!isValidConnection(ronda, targetLlave.ronda)) {
                 toast({ title: "Conexión inválida", description: "Solo se pueden conectar partidos de fases consecutivas", variant: "destructive" });
                 return;
            }

            const res = await fetch(`/api/admin/torneo/${torneoId}/llaves/update-connection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_match_id: llaveId,
                    target_match_id: targetLlave.id,
                    target_slot: pos === 'p1' ? 1 : 2
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                toast({ title: "Error al actualizar conexión", description: getFriendlyError(err.error || "Error al actualizar conexión"), variant: "destructive" });
            } else {
                onLlaveUpdate();
                toast({ title: "Conexión actualizada", description: "Se actualizó la ruta del ganador correctamente" });
            }
        }

    } catch (err) {
        console.error(err);
        toast({ title: "Error inesperado", description: getFriendlyError(err), variant: "destructive" });
    } finally {
        setDraggingPairId(null);
        setDraggingLlaveId(null);
        setDraggingRonda(null);
        setDraggingType(null);
    }
  };

  return (
    <>
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/50 dark:bg-black/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Cuadro de Llaves
            </div>
            <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" onClick={onEliminarLlaves} disabled={isSubmitting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Llaves
                </Button>
            </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative min-h-[400px]">
        {/* SVG Layer for Connections */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-primary/30" />
                </marker>
            </defs>
            {lines.map(line => (
                <path
                    key={line.id}
                    d={`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`}
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-primary/30"
                    markerEnd="url(#arrowhead)"
                />
            ))}
        </svg>

        <div className="flex gap-8 overflow-x-auto pb-4 relative z-10" ref={containerRef}>
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
                    ref={(el) => { cardRefs.current[llave.id] = el; }}
                    onClick={() => !isBye && onResultadoClick(llave)}
                    draggable={canDragConnection(llave.ronda) && llave.estado !== 'finalizado'}
                    onDragStart={(e) => canDragConnection(llave.ronda) && handleConnectionDragStart(e, llave)}
                    className={`rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md relative group ${
                      isBye ? "border-muted bg-muted/30 opacity-60 cursor-default" :
                      llave.estado === 'finalizado' ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : "bg-card hover:border-primary/50"
                    } ${draggingType === 'connection' && draggingLlaveId === llave.id ? 'opacity-50 border-dashed border-primary' : ''}`}
                  >
                    {/* Visual indicator for drag handle */}
                    {canDragConnection(llave.ronda) && llave.estado !== 'finalizado' && (
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 cursor-grab active:cursor-grabbing" title={`Arrastrar para conectar con siguiente ronda`}>
                            <LinkIcon className="h-3 w-3" />
                        </div>
                    )}
                    
                    {/* Connection indicator */}
                    {llave.siguiente_llave_id && (() => {
                        const targetInfo = getTargetMatchInfo(llave.siguiente_llave_id);
                        if (targetInfo) {
                            return (
                                <div className="absolute -top-2 left-2 bg-muted text-muted-foreground text-[10px] px-1.5 rounded border shadow-sm z-10 font-mono">
                                    → {targetInfo.ronda === '4tos' ? '4tos' : targetInfo.ronda} P{targetInfo.posicion} {llave.siguiente_llave_slot === 1 ? '(1)' : '(2)'}
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="space-y-2">
                      {/* Pareja 1 */}
                      <div
                        className={`relative flex items-center justify-between rounded px-2 py-1 text-sm ${
                          !isBye && llave.ganador_id === llave.pareja1_id
                            ? "bg-primary/20 font-bold"
                            : ""
                        } ${hoverDropLlaveId === llave.id && hoverDropPos === 'p1' ? 'ring-2 ring-primary ring-inset bg-primary/10' : ''} ${hoverInvalidLlaveId === llave.id && hoverInvalidPos === 'p1' ? 'ring-2 ring-destructive ring-inset bg-destructive/10' : ''}`}
                        draggable={!!llave.pareja1_id && llave.estado !== 'finalizado'}
                        onDragStart={(e) => llave.pareja1_id && handleDragStart(e, llave.pareja1_id, llave.id, llave.ronda)}
                        onDragOver={(e) => handleDragOver(e, llave, 'p1')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, llave, 'p1')}
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

                      {/* Pareja 2 */}
                      <div
                        className={`relative flex items-center justify-between rounded px-2 py-1 text-sm ${
                          !isBye && llave.ganador_id === llave.pareja2_id
                            ? "bg-primary/20 font-bold"
                            : ""
                        } ${hoverDropLlaveId === llave.id && hoverDropPos === 'p2' ? 'ring-2 ring-primary ring-inset bg-primary/10' : ''} ${hoverInvalidLlaveId === llave.id && hoverInvalidPos === 'p2' ? 'ring-2 ring-destructive ring-inset bg-destructive/10' : ''}`}
                        draggable={!!llave.pareja2_id && llave.estado !== 'finalizado'}
                        onDragStart={(e) => llave.pareja2_id && handleDragStart(e, llave.pareja2_id, llave.id, llave.ronda)}
                        onDragOver={(e) => handleDragOver(e, llave, 'p2')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, llave, 'p2')}
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
                        onClick={(e) => { e.stopPropagation(); onResultadoClick(llave); }}
                      >
                        Resultado
                      </Button>
                    )}
                    {llave.estado === 'finalizado' && !isBye && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={(e) => { e.stopPropagation(); onResultadoClick(llave); }}
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
