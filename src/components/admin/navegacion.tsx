"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/admin/propuestas/nueva", etiqueta: "Capturar propuesta" },
  { href: "/admin/propuestas", etiqueta: "Propuestas" },
  { href: "/admin/rondas", etiqueta: "Rondas" },
  { href: "/admin/ganadores", etiqueta: "Ganadores" },
  { href: "/admin/mantenimiento", etiqueta: "Mantenimiento" },
] as const;

export function Navegacion() {
  const ruta = usePathname();
  // Activo: coincidencia exacta o la ruta más específica que aplique.
  const activo = ENLACES.filter((e) => ruta === e.href || ruta.startsWith(e.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Panel" className="flex items-center gap-0.5">
      {ENLACES.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          aria-current={activo === e.href ? "page" : undefined}
          className={cn(
            "relative rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            activo === e.href &&
              "text-foreground after:absolute after:inset-x-3 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-primary max-lg:bg-secondary max-lg:after:hidden",
          )}
        >
          {e.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
