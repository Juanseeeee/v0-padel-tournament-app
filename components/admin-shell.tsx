'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  BarChart3,
  Building2,
  CalendarDays,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Settings,
  Users,
  User,
} from "lucide-react"

type AdminNavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNav: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Jugadores", href: "/admin/jugadores", icon: Users },
  { label: "Categorías", href: "/admin/categorias", icon: Layers },
  { label: "Sedes", href: "/admin/sedes", icon: Building2 },
  { label: "Fechas", href: "/admin/fechas", icon: CalendarDays },
  { label: "Ranking", href: "/admin/ranking", icon: BarChart3 },
  { label: "Noticias", href: "/admin/noticias", icon: Newspaper },
  { label: "Puntos", href: "/admin/puntos", icon: Settings },
  { label: "Usuarios", href: "/admin/usuarios", icon: Users },
]

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const activeLabel = useMemo(() => {
    const hit = adminNav.find((i) => isActive(pathname ?? "", i.href))
    return hit?.label ?? "Admin"
  }, [pathname])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col gap-1">
      {adminNav.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname ?? "", item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-svh bg-background">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-border lg:bg-background/60 lg:backdrop-blur supports-[backdrop-filter]:lg:bg-background/40">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">Administración</div>
            <div className="truncate text-xs text-muted-foreground">Panel de control</div>
          </div>
        </div>

        <div className="flex-1 px-3">
          <NavLinks />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Cerrando..." : "Salir"}
          </Button>
        </div>
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú admin">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold leading-none">Administración</span>
                        <span className="text-xs text-muted-foreground">Panel de control</span>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="px-2">
                    <NavLinks
                      onNavigate={() => {
                        const el = document.activeElement as HTMLElement | null
                        el?.blur()
                      }}
                    />
                  </div>

                  <div className="mt-auto grid gap-2 px-4 pb-4">
                    <div className="flex items-center justify-between">
                      <ThemeToggle />
                      <SheetClose asChild>
                        <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut} className="gap-2">
                          <LogOut className="h-4 w-4" />
                          {loggingOut ? "Cerrando..." : "Salir"}
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold leading-tight">{activeLabel}</div>
                <div className="truncate text-xs text-muted-foreground">Admin</div>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Cerrando..." : "Salir"}
              </Button>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}

