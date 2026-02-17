"use client";

import { useState } from "react";
import { AdminWrapper } from "@/components/admin/admin-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ImportarDatosPage() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<{categorias: number, sedes: number, jugadores: number} | null>(null);

  const handleImportData = async () => {
    setStatus('loading');
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/import-verano', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al importar datos');
      }
      
      setStatus('success');
      setMessage(data.message);
      setStats(data.stats);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  return (
    <AdminWrapper
      title="Importar Datos de Verano"
      description="Cargar jugadores, categorías y sedes desde la liga de verano"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Import Card */}
        <Card className="border-none shadow-md bg-card/95 backdrop-blur-sm ring-1 ring-border/50">
          <CardHeader>
            <CardTitle>Datos a Importar</CardTitle>
            <CardDescription>
              Este proceso cargará los siguientes datos desde los CSVs de la liga de verano:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">10 Categorías</p>
                  <p className="text-sm text-muted-foreground">
                    4TA, 5TA, 6TA, 7MA, 8VA (Damas y Caballeros) y SUMA 8
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">28 Sedes</p>
                  <p className="text-sm text-muted-foreground">
                    Todas las localidades donde se jugó la liga (Arenales, Arribeños, Ascension, Ferre, etc.)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">500+ Jugadores</p>
                  <p className="text-sm text-muted-foreground">
                    Todos los jugadores de las 10 categorías con nombre, apellido y localidad
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> El sistema detecta automáticamente duplicados. 
                Si un jugador, categoría o sede ya existe en la base de datos, no se volverá a insertar.
              </p>
            </div>

            {status === 'idle' && (
              <Button 
                onClick={handleImportData}
                className="w-full"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Importar Datos
              </Button>
            )}

            {status === 'loading' && (
              <Button disabled className="w-full" size="lg">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Importando datos...
              </Button>
            )}

            {status === 'success' && (
              <Alert className="border-primary bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertTitle>Importación Exitosa</AlertTitle>
                <AlertDescription>
                  {message}
                  {stats && (
                    <div className="mt-3 space-y-1">
                      <p>• Categorías: {stats.categorias}</p>
                      <p>• Sedes: {stats.sedes}</p>
                      <p>• Jugadores: {stats.jugadores}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error en la Importación</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {(status === 'success' || status === 'error') && (
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setStatus('idle');
                    setMessage('');
                    setStats(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Reintentar
                </Button>
                <Link href="/admin/jugadores" className="flex-1">
                  <Button className="w-full">
                    Ver Jugadores
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminWrapper>
  );
}
