"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGridIcon, TableIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PropuestaAdmin } from "@/lib/datos/gestion";
import { formatearFolio } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";
import { TarjetaPropuesta } from "./tarjeta-propuesta";

export type Vista = "tabla" | "tarjetas";

const fecha = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

/** Recuerda la vista en este navegador (cookie por admin, la lee el servidor). */
function recordarVista(cookie: string, v: Vista) {
  document.cookie = `${cookie}=${v}; path=/admin; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function ListaPropuestas({
  filas,
  logos,
  vistaInicial,
  cookieVista,
}: {
  filas: PropuestaAdmin[];
  logos: Record<string, string>;
  vistaInicial: Vista;
  /** Cookie (por admin) donde se recuerda la vista elegida en este navegador. */
  cookieVista: string;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>(vistaInicial);

  function cambiarVista(v: Vista) {
    setVista(v);
    recordarVista(cookieVista, v);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div role="radiogroup" aria-label="Vista" className="inline-flex rounded-lg border bg-card p-0.5">
          {(
            [
              ["tabla", "Tabla", TableIcon],
              ["tarjetas", "Tarjetas", LayoutGridIcon],
            ] as const
          ).map(([v, etiqueta, Icono]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={vista === v}
              onClick={() => cambiarVista(v)}
              data-testid={`vista-${v}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors",
                vista === v ? "bg-accent font-medium text-accent-foreground" : "hover:text-foreground",
              )}
            >
              <Icono className="size-4" />
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {vista === "tarjetas" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="lista-tarjetas">
          {filas.map((p) => (
            <Link
              key={p.id}
              href={`/admin/propuestas/${p.id}`}
              className="rounded-xl transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50"
              data-testid="tarjeta-propuesta"
            >
              <TarjetaPropuesta
                className="h-full"
                descartada={p.estado === "descartada"}
                datos={{
                  folio: formatearFolio(p.folio),
                  nombrePropuesto: p.nombre_propuesto,
                  significado: p.significado,
                  participante: p.participante_nombre,
                  area: p.area,
                  ciudad: p.ciudad,
                  logoUrl: logos[p.logo_path],
                }}
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm" data-testid="lista-tabla">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-3 font-medium">Folio</th>
                <th className="px-3 py-3 font-medium">Logo</th>
                <th className="px-3 py-3 font-medium">Nombre propuesto</th>
                <th className="px-3 py-3 font-medium">Participante</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Área</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Ciudad</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Capturada por</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filas.map((p) => (
                <tr
                  key={p.id}
                  data-testid="fila-propuesta"
                  onClick={() => router.push(`/admin/propuestas/${p.id}`)}
                  className={cn("cursor-pointer hover:bg-muted/40", p.estado === "descartada" && "text-muted-foreground")}
                >
                  <td className="px-3 py-2 font-mono tabular-nums">
                    <Link href={`/admin/propuestas/${p.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {formatearFolio(p.folio)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex size-11 items-center justify-center overflow-hidden rounded-md border bg-lienzo-logo">
                      {logos[p.logo_path] && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                        <img
                          src={logos[p.logo_path]}
                          alt=""
                          loading="lazy"
                          className={cn("max-h-full max-w-full object-contain", p.estado === "descartada" && "opacity-50 grayscale")}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">{p.nombre_propuesto}</td>
                  <td className="px-3 py-2">{p.participante_nombre}</td>
                  <td className="hidden px-3 py-2 md:table-cell">{p.area}</td>
                  <td className="hidden px-3 py-2 md:table-cell">{p.ciudad}</td>
                  <td className="px-3 py-2">
                    {p.estado === "activa" ? (
                      <Badge variant="secondary">Activa</Badge>
                    ) : (
                      <Badge variant="destructive">Descartada</Badge>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 lg:table-cell">{p.capturada_por_nombre ?? "—"}</td>
                  <td className="hidden px-3 py-2 whitespace-nowrap lg:table-cell">{fecha.format(new Date(p.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
