import { sql } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { 
  Users, Calendar, Trophy, FileText, Settings,
  UserPlus, CalendarPlus, Medal, ArrowRight, TrendingUp,
  Building2, Layers, Upload
} from "lucide-react"

async function getEstadisticas() {
  const [jugadores, fechas, participaciones, informes, categorias, sedes] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM jugadores WHERE estado = 'activo'`,
    sql`SELECT COUNT(*) as count FROM fechas_torneo`,
    sql`SELECT COUNT(*) as count FROM participaciones`,
    sql`SELECT COUNT(*) as count FROM informes`,
    sql`SELECT COUNT(*) as count FROM categorias`,
    sql`SELECT COUNT(*) as count FROM sedes WHERE activa = true`
  ])

  return {
    jugadores: Number(jugadores[0]?.count) || 0,
    fechas: Number(fechas[0]?.count) || 0,
    participaciones: Number(participaciones[0]?.count) || 0,
    informes: Number(informes[0]?.count) || 0,
    categorias: Number(categorias[0]?.count) || 0,
    sedes: Number(sedes[0]?.count) || 0,
  }
}

export default async function AdminPage() {
  const stats = await getEstadisticas()

  const adminSections = [
    {
      title: "Jugadores",
      description: "Gestionar jugadores y sus datos",
      icon: Users,
      href: "/admin/jugadores",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      stats: stats.jugadores,
      actions: [
        { label: "Ver Jugadores", href: "/admin/jugadores", icon: Users },
      ]
    },
    {
      title: "Categorías",
      description: "Administrar las categorías de la liga",
      icon: Layers,
      href: "/admin/categorias",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      stats: stats.categorias,
      actions: [
        { label: "Ver Categorías", href: "/admin/categorias", icon: Layers },
      ]
    },
    {
      title: "Sedes",
      description: "Gestionar las sedes de torneos",
      icon: Building2,
      href: "/admin/sedes",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      stats: stats.sedes,
      actions: [
        { label: "Ver Sedes", href: "/admin/sedes", icon: Building2 },
      ]
    },
    {
      title: "Fechas / Torneos",
      description: "Crear y gestionar fechas de torneo",
      icon: Calendar,
      href: "/admin/fechas",
      color: "text-primary",
      bgColor: "bg-primary/10",
      stats: stats.fechas,
      actions: [
        { label: "Ver Fechas", href: "/admin/fechas", icon: Calendar },
      ]
    },
    {
      title: "Ranking",
      description: "Ver ranking y puntos por categoria",
      icon: Trophy,
      href: "/admin/ranking",
      color: "text-accent",
      bgColor: "bg-accent/10",
      stats: stats.participaciones,
      actions: [
        { label: "Ver Ranking", href: "/admin/ranking", icon: Medal },
      ]
    },
    {
      title: "Noticias",
      description: "Publicar informes y noticias",
      icon: FileText,
      href: "/admin/noticias",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      stats: stats.informes,
      actions: [
        { label: "Ver Noticias", href: "/admin/noticias", icon: FileText },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        {/* Admin Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.title} className="overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-5 w-5 ${section.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 px-3 py-1">
                      <span className="font-bold text-xl text-foreground">
                        {section.stats}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {section.actions.map((action) => {
                      const ActionIcon = action.icon
                      return (
                        <Link key={action.href} href={action.href}>
                          <Button variant="secondary" size="sm" className="gap-2">
                            <ActionIcon className="h-4 w-4" />
                            {action.label}
                          </Button>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/admin/importar">
                <Button variant="outline" className="w-full justify-between bg-primary/10 border-primary/50 hover:bg-primary/20">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Importar Datos
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/jugadores">
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Nuevo Jugador
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/fechas">
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <span className="flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Nueva Fecha
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/resultados">
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <span className="flex items-center gap-2">
                    <Medal className="h-4 w-4" />
                    Cargar Resultados
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/noticias">
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Nueva Noticia
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/puntos">
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Config. Puntos
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
