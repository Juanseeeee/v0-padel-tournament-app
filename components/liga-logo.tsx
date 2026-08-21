import { cn } from "@/lib/utils";

interface LigaLogoProps {
  /** Alto del emblema en px (el wordmark escala en proporción). */
  size?: number;
  /** Mostrar el texto "LIGA DE PÁDEL" al lado del emblema. */
  withWordmark?: boolean;
  /** Línea extra debajo del wordmark (ej. "MASTER 2026"). */
  tagline?: string;
  className?: string;
}

/**
 * Emblema de pádel: raqueta perforada + pelota, dentro de un escudo redondeado.
 * Usa `currentColor` para el trazo principal (theme-aware) y el token `--primary`
 * para la pelota, de modo que combina en claro/oscuro. Fácil de reemplazar por
 * un logo real más adelante.
 */
export function LigaLogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Liga de Pádel"
      className={className}
    >
      {/* Escudo / fondo */}
      <rect x="2" y="2" width="60" height="60" rx="16" className="fill-primary/10" />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="15.25"
        className="stroke-primary/30"
        strokeWidth="1.5"
      />
      {/* Raqueta */}
      <g className="stroke-foreground" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Cabeza de la raqueta */}
        <path d="M32 10c-9.4 0-16 6.9-16 15.8 0 8.2 6 14 14 14.9v6.4" />
        <path d="M32 10c9.4 0 16 6.9 16 15.8 0 8.2-6 14-14 14.9v6.4" />
        {/* Puente/base de la cabeza */}
        <path d="M25 40.5h14" />
        {/* Mango */}
        <path d="M30 47.5h4v6.5a2 2 0 0 1-2 2 2 2 0 0 1-2-2z" className="fill-foreground/10" />
      </g>
      {/* Perforaciones de la raqueta */}
      <g className="fill-foreground/55">
        <circle cx="27" cy="23" r="1.5" />
        <circle cx="32" cy="21.5" r="1.5" />
        <circle cx="37" cy="23" r="1.5" />
        <circle cx="24.5" cy="28" r="1.5" />
        <circle cx="32" cy="27.5" r="1.5" />
        <circle cx="39.5" cy="28" r="1.5" />
        <circle cx="27" cy="33" r="1.5" />
        <circle cx="37" cy="33" r="1.5" />
      </g>
      {/* Pelota */}
      <circle cx="45" cy="17" r="6" className="fill-primary" />
      <path
        d="M40 14.2c2.6 1 4.4 3.3 4.8 6.1M50 14.2c-2.6 1-4.4 3.3-4.8 6.1"
        className="stroke-primary-foreground"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LigaLogo({ size = 40, withWordmark = true, tagline, className }: LigaLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LigaLogoMark size={size} className="shrink-0" />
      {withWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className="font-semibold tracking-[0.18em] text-muted-foreground"
            style={{ fontSize: Math.round(size * 0.24) }}
          >
            LIGA DE
          </span>
          <span
            className="font-[var(--font-display)] font-bold tracking-wide text-foreground"
            style={{ fontSize: Math.round(size * 0.46) }}
          >
            PÁDEL
          </span>
          {tagline && (
            <span
              className="mt-1 font-semibold uppercase tracking-[0.2em] text-primary"
              style={{ fontSize: Math.round(size * 0.2) }}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
