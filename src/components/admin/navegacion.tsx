"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/admin/propuestas/nueva", etiqueta: "Capturar propuesta" },
  { href: "/admin/propuestas", etiqueta: "Propuestas" },
  { href: "/admin/mantenimiento", etiqueta: "Mantenimiento" },
] as const;

export function Navegacion() {
  const ruta = usePathname();
  // Activo: coincidencia exacta o la ruta más específica que aplique.
  const activo = ENLACES.filter((e) => ruta === e.href || ruta.startsWith(e.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Panel" className="flex items-center gap-1">
      {ENLACES.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          aria-current={activo === e.href ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            activo === e.href && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {e.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
