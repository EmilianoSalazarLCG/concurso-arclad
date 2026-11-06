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
        <div role="radiogroup" aria-label="Vista" className="inline-flex rounded-lg border bg-card p-1 shadow-xs">
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
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors",
                vista === v ? "bg-tinta text-tinta-foreground shadow-xs" : "hover:text-foreground",
              )}
            >
              <Icono className="size-4" />
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {vista === "tarjetas" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="lista-tarjetas">
          {filas.map((p, i) => (
            <Link
              key={p.id}
              href={`/admin/propuestas/${p.id}`}
              style={{ "--i": i } as React.CSSProperties}
              className="aparecer rounded-xl outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/50 [&>article]:transition-shadow [&>article]:duration-200 hover:[&>article]:shadow-md"
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
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm" data-testid="lista-tabla">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/60 text-left text-[0.7rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-3.5">Folio</th>
                <th className="px-3 py-3.5">Logo</th>
                <th className="px-3 py-3.5">Nombre propuesto</th>
                <th className="px-3 py-3.5">Participante</th>
                <th className="hidden px-3 py-3.5 md:table-cell">Área</th>
                <th className="hidden px-3 py-3.5 md:table-cell">Ciudad</th>
                <th className="px-3 py-3.5">Estado</th>
                <th className="hidden px-3 py-3.5 lg:table-cell">Capturada por</th>
                <th className="hidden px-3 py-3.5 lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filas.map((p) => (
                <tr
                  key={p.id}
                  data-testid="fila-propuesta"
                  onClick={() => router.push(`/admin/propuestas/${p.id}`)}
                  className={cn("cursor-pointer transition-colors hover:bg-accent/40", p.estado === "descartada" && "text-muted-foreground")}
                >
                  <td className="px-4 py-3 font-semibold text-muted-foreground cifras">
                    <Link href={`/admin/propuestas/${p.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {formatearFolio(p.folio)}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border bg-lienzo-logo p-1">
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
                  <td className="px-3 py-3 font-heading text-base font-semibold text-foreground">{p.nombre_propuesto}</td>
                  <td className="px-3 py-3">{p.participante_nombre}</td>
                  <td className="hidden px-3 py-3 md:table-cell">{p.area}</td>
                  <td className="hidden px-3 py-3 md:table-cell">{p.ciudad}</td>
                  <td className="px-3 py-3">
                    {p.estado === "activa" ? (
                      <Badge variant="exito">Activa</Badge>
                    ) : (
                      <Badge variant="destructive">Descartada</Badge>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">{p.capturada_por_nombre ?? "—"}</td>
                  <td className="hidden px-3 py-3 whitespace-nowrap text-muted-foreground lg:table-cell">{fecha.format(new Date(p.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
