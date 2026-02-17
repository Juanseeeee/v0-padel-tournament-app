"use client";

import React from "react"

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
import { Loader2, UserPlus, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categorias, setCategorias] = useState<any[]>([]);
  const [localidades, setLocalidades] = useState<any[]>([]);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    password2: "",
    telefono: "",
    localidad: "",
    categoria_id: "",
  });

  useEffect(() => {
    fetch("/api/public/categorias").then(r => r.json()).then(setCategorias).catch(() => {});
    fetch("/api/public/localidades").then(r => r.json()).then(setLocalidades).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.password2) {
      setError("Las contrasenas no coinciden");
      return;
    }
    if (form.password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return;
    }
    if (!form.categoria_id) {
      setError("Selecciona una categoria");
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
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 self-start">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Registrate para inscribirte en torneos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="telefono">Telefono</Label>
              <Input id="telefono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} placeholder="Ej: 2477-401234" />
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
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={form.categoria_id}
                onValueChange={(val) => setForm({...form, categoria_id: val})}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Seleccionar categoria..." />
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
                <Label htmlFor="password">Contrasena</Label>
                <Input id="password" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password2">Confirmar</Label>
                <Input id="password2" type="password" required value={form.password2} onChange={e => setForm({...form, password2: e.target.value})} />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Registrarse
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Ya tenes cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">Inicia sesion</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
