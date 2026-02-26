import { sql } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminWrapper } from "@/components/admin-wrapper"
import { 
  Users, Calendar, Trophy, FileText, Settings,
  UserPlus, CalendarPlus, Medal, ArrowRight, TrendingUp,
  Building2, Layers, Upload, Activity
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
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
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
    <AdminWrapper 
      title="Panel de Control" 
      description="Bienvenido al sistema de administración de Premier Padel."
      showBackButton={false}
    >
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4">
            {[
                { href: "/admin/jugadores", icon: UserPlus, label: "Nuevo Jugador" },
                { href: "/admin/fechas", icon: CalendarPlus, label: "Nueva Fecha" },
                { href: "/admin/importar", icon: Upload, label: "Importar" },
                { href: "/admin/noticias", icon: FileText, label: "Noticia" },
                { href: "/admin/puntos", icon: Settings, label: "Puntos" },
            ].map((action, i) => (
                <Link key={i} href={action.href}>
                    <Card className="h-full border-none shadow-md hover:shadow-lg transition-all hover:-translate-y-1 bg-card/95 backdrop-blur-sm group">
                        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <action.icon className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{action.label}</span>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>

        {/* Admin Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section, idx) => {
            const Icon = section.icon
            return (
              <Card key={section.title} className="overflow-hidden border-none shadow-lg bg-card/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ring-1 ring-border/50 group animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${idx * 50}ms` }}>
                <CardHeader className="pb-3 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500`}>
                     <Icon className={`h-24 w-24 ${section.color}`} />
                  </div>
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${section.bgColor} shadow-inner`}>
                        <Icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">{section.title}</CardTitle>
                        <CardDescription className="text-xs font-medium">{section.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                   <div className="flex items-end justify-between mb-4">
                        <div className="text-3xl font-black text-foreground">{section.stats}</div>
                        <div className="text-xs font-bold uppercase text-muted-foreground bg-muted px-2 py-1 rounded-md mb-1">Registros</div>
                   </div>

                  <div className="flex flex-wrap gap-2">
                    {section.actions.map((action) => {
                      const ActionIcon = action.icon
                      return (
                        <Link key={action.href} href={action.href} className="w-full">
                          <Button variant="secondary" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <span className="flex items-center gap-2">
                                <ActionIcon className="h-4 w-4" />
                                {action.label}
                            </span>
                            <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
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
    </AdminWrapper>
  )
}
