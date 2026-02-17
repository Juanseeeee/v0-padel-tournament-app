"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Newspaper,
  Trophy,
  User,
  Users,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";

  const hide =
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/api");

  if (hide) return null;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  const items: NavItem[] = isAdmin
    ? [
        { label: "Admin", href: "/admin", Icon: LayoutDashboard, exact: true },
        { label: "Jugadores", href: "/admin/jugadores", Icon: Users },
        { label: "Fechas", href: "/admin/fechas", Icon: CalendarDays },
        { label: "Ranking", href: "/admin/ranking", Icon: BarChart3 },
        { label: "Noticias", href: "/admin/noticias", Icon: Newspaper },
      ]
    : [
        { label: "Inicio", href: "/", Icon: Trophy, exact: true },
        { label: "Noticias", href: "/noticias", Icon: FileText },
        { label: "Calendario", href: "/calendario", Icon: CalendarDays },
        { label: "Rankings", href: "/rankings", Icon: Users },
        { label: "Portal", href: "/portal", Icon: User },
      ];

  const left = items[0];
  const leftMid = items[1];
  const center = items[2];
  const rightMid = items[3];
  const right = items[4];

  const LeftIcon = left.Icon;
  const LeftMidIcon = leftMid.Icon;
  const CenterIcon = center.Icon;
  const RightMidIcon = rightMid.Icon;
  const RightIcon = right.Icon;

  return (
    <>
      <nav className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-2 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
          <Link
            href={left.href}
            aria-current={isActive(pathname, left.href, left.exact) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
              isActive(pathname, left.href, left.exact)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LeftIcon className="h-5 w-5" />
            {left.label}
          </Link>

          <Link
            href={leftMid.href}
            aria-current={isActive(pathname, leftMid.href, leftMid.exact) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
              isActive(pathname, leftMid.href, leftMid.exact)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LeftMidIcon className="h-5 w-5" />
            {leftMid.label}
          </Link>

          <div className="flex flex-1 flex-col items-center">
            <Link
              href={center.href}
              aria-current={isActive(pathname, center.href, center.exact) ? "page" : undefined}
              className="-mt-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95"
              aria-label={center.label}
            >
              <CenterIcon className="h-6 w-6" />
            </Link>
            <span
              className={`mt-1 text-[11px] font-medium ${
                isActive(pathname, center.href, center.exact)
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {center.label}
            </span>
          </div>

          <Link
            href={rightMid.href}
            aria-current={isActive(pathname, rightMid.href, rightMid.exact) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
              isActive(pathname, rightMid.href, rightMid.exact)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RightMidIcon className="h-5 w-5" />
            {rightMid.label}
          </Link>

          <Link
            href={right.href}
            aria-current={isActive(pathname, right.href, right.exact) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
              isActive(pathname, right.href, right.exact)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RightIcon className="h-5 w-5" />
            {right.label}
          </Link>
        </div>
      </nav>
    </>
  );
}