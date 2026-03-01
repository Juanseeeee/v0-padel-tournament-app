
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categorias, setCategorias] = useState<any[]>([]);
  const [localidades, setLocalidades] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [sugerenciaSeleccionada, setSugerenciaSeleccionada] = useState<string>("");

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    dni: "",
    telefono: "",
    password: "",
    password2: "",
    localidad: "",
    categoria_id: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  useEffect(() => {
    fetch("/api/public/categorias").then(r => r.json()).then(setCategorias).catch(() => {});
    fetch("/api/public/localidades").then(r => r.json()).then(setLocalidades).catch(() => {});
  }, []);

  useEffect(() => {
    const n = form.nombre.trim();
    const a = form.apellido.trim();
    if (!n || !a) {
      setSugerencias([]);
      return;
    }
    const url = `/api/public/jugadores/sugerencias?nombre=${encodeURIComponent(n)}&apellido=${encodeURIComponent(a)}`;
    fetch(url).then(r => r.json()).then(d => setSugerencias(d.jugadores || [])).catch(() => setSugerencias([]));
  }, [form.nombre, form.apellido]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.password2) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (!form.categoria_id) {
      setError("Selecciona una categoría");
      return;
    }
    if (!form.dni) {
      setError("El DNI es obligatorio");
      return;
    }
    if (!form.telefono) {
      setError("El teléfono es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nombre: form.nombre,
          apellido: form.apellido,
          dni: form.dni,
          telefono: form.telefono,
          localidad: form.localidad || null,
          categoria_id: parseInt(form.categoria_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al registrarse");
      } else {
        router.push("/portal");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 left-4">
        <Link href="/" aria-label="Volver al inicio">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Regístrate para inscribirte en torneos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {sugerencias.length > 0 && (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
                <div className="font-medium">Encontramos {sugerencias.length} jugador(es) con este nombre cargados por admin</div>
                <div className="mt-2 text-muted-foreground">Confirmá si sos uno de estos y completá DNI, teléfono y email para vincular tu cuenta.</div>
                <ul className="mt-2 space-y-1">
                  {sugerencias.map((s: any) => (
                    <li key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="soy-esta-persona"
                          value={String(s.id)}
                          checked={sugerenciaSeleccionada === String(s.id)}
                          onChange={() => {
                            setSugerenciaSeleccionada(String(s.id));
                            setForm(f => ({
                              ...f,
                              localidad: s.localidad || f.localidad,
                              categoria_id: (s.categoria_ids?.split(',')[0]) || f.categoria_id,
                              nombre: s.nombre || f.nombre,
                              apellido: s.apellido || f.apellido,
                            }));
                          }}
                        />
                        <span className="font-medium">{s.nombre} {s.apellido}</span>
                      </label>
                      <span className="text-xs text-muted-foreground">{s.localidad || "Sin localidad"}</span>
                      <span className="text-xs">{s.categorias_nombres || "Sin categorías"}</span>
                    </li>
                  ))}
                </ul>
                {sugerenciaSeleccionada && (
                  <div className="mt-2 text-xs text-primary">
                    Autocompletamos localidad y categoría del registro admin. Completá DNI, teléfono y email para continuar.
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" required value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="dni">DNI</Label>
              <Input id="dni" required value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} placeholder="Ej: 12345678" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" required value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} placeholder="Ej: 2477-401234" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="localidad">Localidad</Label>
              <Select
                value={form.localidad}
                onValueChange={(val) => setForm({...form, localidad: val})}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {localidades.map((l: any) => (
                    <SelectItem key={l.id} value={l.nombre}>{l.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              <Select
                value={form.categoria_id}
                onValueChange={(val) => setForm({...form, categoria_id: val})}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Seleccionar categoría..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password2">Confirmar</Label>
                <div className="relative">
                  <Input
                    id="password2"
                    type={showPassword2 ? "text" : "password"}
                    required
                    value={form.password2}
                    onChange={e => setForm({...form, password2: e.target.value})}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword2 ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPassword2(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Registrarse
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">Inicia sesión</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
