"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, Trophy, Calendar, Users, FileText, Shield, LogIn, UserPlus } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const navigation = [
  { name: "Inicio", href: "/", icon: Trophy },
  { name: "Calendario", href: "/calendario", icon: Calendar },
  { name: "Rankings", href: "/rankings", icon: Users },
  { name: "Noticias", href: "/noticias", icon: FileText },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8 lg:py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-[var(--font-display)] text-lg sm:text-xl tracking-wide text-foreground leading-none truncate">
              LIGA DE PADEL
            </span>
            <span className="hidden sm:block text-xs text-muted-foreground">Sistema de Gestión</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <LogIn className="h-4 w-4" />
              Ingresar
            </Button>
          </Link>
          <Link href="/registro">
            <Button size="sm" className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Registrarse
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="sr-only">Abrir menú</span>
          {mobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card">
          <div className="space-y-1 px-4 pb-4 pt-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              <Link
                href="/login"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="h-5 w-5" />
                Ingresar
              </Link>
              <Link
                href="/registro"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-primary hover:bg-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserPlus className="h-5 w-5" />
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
