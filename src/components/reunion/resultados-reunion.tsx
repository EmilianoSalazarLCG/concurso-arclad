"use client";

import { useEffect, useState } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { cargarResultadosReunion } from "@/app/admin/reunion/acciones";
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
    <main className="flex-1 px-6 pt-24 pb-10 sm:px-10" data-testid="vista-resultados">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {datos && (
            <>
              <h1 className="text-4xl font-semibold xl:text-5xl">
                Resultados · Ronda {datos.ronda.numero}
              </h1>
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
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={promedios} onChange={(e) => setPromedios(e.target.checked)} data-testid="mostrar-promedios" />
            Mostrar promedios
          </label>
        </div>
      </div>

      {datos === undefined && (
        <p className="flex items-center gap-2 text-xl text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" /> Cargando…
        </p>
      )}
      {datos === null && <p className="text-2xl text-muted-foreground">No hay resultados para mostrar.</p>}
      {datos && (
        <ol className={cn("grid gap-3", muchas && "xl:grid-flow-col xl:grid-cols-2")} style={muchas ? { gridTemplateRows: `repeat(${Math.ceil(datos.filas.length / 2)}, auto)` } : undefined}>
          {datos.filas.map((f) => (
            <li
              key={f.propuesta_id}
              data-testid="fila-reunion"
              data-pasa={f.pasa}
              className={cn(
                "flex items-center gap-4 rounded-2xl border px-4 py-2.5 transition",
                f.pasa ? "border-primary/50 bg-accent text-accent-foreground" : "bg-card text-muted-foreground opacity-80",
              )}
            >
              <span className="w-10 text-right font-heading text-3xl font-semibold tabular-nums">{f.posicion}</span>
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-lienzo-logo p-1">
                {f.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                  <img src={f.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                )}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-2xl font-semibold", f.pasa && "text-foreground")}>{f.nombre}</span>
              {promedios && (
                <span className="font-mono text-2xl tabular-nums" data-testid="promedio-reunion">
                  {f.promedio === null ? "—" : f.promedio.toFixed(2)}
                </span>
              )}
              {f.pasa && <CheckIcon className="size-7 shrink-0 text-primary" aria-label="Pasa" />}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
