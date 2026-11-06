"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { cargarResultadosReunion } from "@/app/admin/reunion/acciones";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResultadosReunion, RondaReunion } from "@/lib/datos/reunion";
import { cn } from "@/lib/utils";

/** Ranking proyectable (sin calificaciones por gerente ni autor). */
export function VistaResultados({ cerradas }: { cerradas: RondaReunion[] }) {
  const [rondaId, setRondaId] = useState(cerradas[cerradas.length - 1]?.id ?? "");
  const [datos, setDatos] = useState<ResultadosReunion | null | undefined>(undefined);
  const [promedios, setPromedios] = useState(false);

  useEffect(() => {
    let vivo = true;
    void cargarResultadosReunion(rondaId).then((r) => vivo && setDatos(r.ok ? r.data : null));
    return () => {
      vivo = false;
    };
  }, [rondaId]);

  const cambiarRonda = (id: string) => {
    setDatos(undefined);
    setRondaId(id);
  };
  const muchas = (datos?.filas.length ?? 0) > 8;

  return (
    <main className="flex-1 px-6 pt-28 pb-12 sm:px-12" data-testid="vista-resultados">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {datos && (
            <>
              <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">Resultados</p>
              <h1 className="mt-2 text-5xl font-semibold xl:text-6xl">Ronda {datos.ronda.numero}</h1>
              <p className="mt-2 text-xl text-muted-foreground">
                {datos.esFinal ? `Top ${datos.ronda.top_n}` : `Pasan ${datos.filas.filter((f) => f.pasa).length} a la Ronda ${datos.siguiente}`}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {cerradas.length > 1 && (
            <select
              aria-label="Ronda"
              value={rondaId}
              onChange={(e) => cambiarRonda(e.target.value)}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
              data-testid="ronda-resultados"
            >
              {cerradas.map((r) => (
                <option key={r.id} value={r.id}>
                  Ronda {r.numero} · {r.nombre}
                </option>
              ))}
            </select>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={promedios} onChange={(e) => setPromedios(e.target.checked)} data-testid="mostrar-promedios" />
            Mostrar promedios
          </label>
        </div>
      </div>

      {datos === undefined && (
        <div className="grid gap-3 xl:grid-cols-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}
      {datos === null && <p className="text-2xl text-muted-foreground">No hay resultados para mostrar.</p>}
      {datos && (
        <ol className={cn("grid gap-3", muchas && "xl:grid-flow-col xl:grid-cols-2")} style={muchas ? { gridTemplateRows: `repeat(${Math.ceil(datos.filas.length / 2)}, auto)` } : undefined}>
          {datos.filas.map((f, i) => (
            <li
              key={f.propuesta_id}
              data-testid="fila-reunion"
              data-pasa={f.pasa}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(
                "aparecer flex items-center gap-4 rounded-2xl border px-4 py-2.5",
                f.pasa ? "border-primary/40 bg-card text-foreground shadow-md" : "border-transparent bg-card/40 text-muted-foreground",
                datos.esFinal && f.pasa && "border-oro/50",
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl font-heading text-2xl font-semibold cifras",
                  datos.esFinal && f.pasa
                    ? f.posicion === 1
                      ? "bg-oro text-tinta"
                      : f.posicion === 2
                        ? "bg-plata text-tinta"
                        : "bg-bronce text-white"
                    : f.pasa
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {f.posicion}
              </span>
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-lienzo-logo p-1">
                {f.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                  <img src={f.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                )}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-2xl font-semibold", f.pasa && "text-foreground")}>{f.nombre}</span>
              {promedios && (
                <span className="font-heading text-2xl font-semibold cifras" data-testid="promedio-reunion">
                  {f.promedio === null ? "—" : f.promedio.toFixed(2)}
                </span>
              )}
              {f.pasa && <CheckIcon className={cn("size-7 shrink-0", datos.esFinal ? "text-oro" : "text-primary")} aria-label="Pasa" />}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
