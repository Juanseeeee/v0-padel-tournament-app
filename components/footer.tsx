import { Trophy } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-[var(--font-display)] text-lg tracking-wide text-foreground">
              LIGA DE PADEL
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} Liga de Padel. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
