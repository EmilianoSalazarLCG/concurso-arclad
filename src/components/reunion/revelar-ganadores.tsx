"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, TrophyIcon } from "lucide-react";
import { cargarGanadoresReunion } from "@/app/admin/reunion/acciones";
import type { GanadorReunion } from "@/lib/datos/reunion";
import { cn } from "@/lib/utils";

const LUGAR: Record<number, string> = { 1: "1er lugar", 2: "2º lugar", 3: "3er lugar" };

/**
 * Revelación: portada → 3er lugar → 2º → 1º → podio. Avanza con →, espacio o clic; ← regresa.
 * El autor aparece al revelar cada lugar.
 */
export function RevelarGanadores() {
  const [ganadores, setGanadores] = useState<GanadorReunion[] | null | undefined>(undefined);
  const [paso, setPaso] = useState(0);
  const total = (ganadores?.length ?? 0) + 2; // portada + lugares + podio

  useEffect(() => {
    void cargarGanadoresReunion().then((r) => setGanadores(r.ok ? r.data : null));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setPaso((p) => Math.min(p + 1, total - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPaso((p) => Math.max(p - 1, 0));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [total]);

  if (ganadores === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center text-2xl text-muted-foreground">
        <Loader2Icon className="mr-2 size-6 animate-spin" /> Cargando…
      </main>
    );
  }
  if (!ganadores?.length) {
    return <main className="flex flex-1 items-center justify-center text-3xl">Los ganadores aún no están confirmados.</main>;
  }

  const n = ganadores.length;
  const lugarActual = paso >= 1 && paso <= n ? n + 1 - paso : null; // 3, 2, 1
  const ganador = lugarActual ? ganadores.find((g) => g.lugar === lugarActual) : null;
  const porLugar = (l: number) => ganadores.find((g) => g.lugar === l);

  return (
    <main
      className="flex flex-1 cursor-pointer flex-col items-center justify-center px-8 pt-24 pb-16 select-none"
      onClick={() => setPaso((p) => Math.min(p + 1, total - 1))}
      data-testid="revelar"
      data-paso={paso}
    >
      {paso === 0 && (
        <div key="portada" className="animate-in text-center duration-700 fade-in" data-testid="portada">
          <TrophyIcon className="mx-auto size-24 text-primary" strokeWidth={1.25} />
          <h1 className="mt-6 text-7xl font-semibold">Ganadores del concurso</h1>
          <p className="mt-6 text-2xl text-muted-foreground">Presiona → para revelar el {LUGAR[n]}</p>
        </div>
      )}

      {ganador && (
        <div
          key={`lugar-${ganador.lugar}`}
          className="grid w-full max-w-7xl animate-in items-center gap-12 duration-1000 fade-in zoom-in-95 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
          data-testid="lugar-revelado"
          data-lugar={ganador.lugar}
        >
          <div className="flex aspect-square max-h-[62vh] items-center justify-center rounded-3xl bg-lienzo-logo p-10">
            {ganador.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada
              <img src={ganador.logoUrl} alt={`Logo de ${ganador.nombre}`} className="max-h-full max-w-full object-contain" />
            )}
          </div>
          <div className="space-y-5">
            <p className={cn("text-3xl font-semibold tracking-wide uppercase", ganador.lugar === 1 ? "text-primary" : "text-muted-foreground")}>
              {LUGAR[ganador.lugar]}
            </p>
            <h1 className="text-7xl leading-[1.05] font-semibold break-words xl:text-8xl" data-testid="nombre-ganador">
              {ganador.nombre}
            </h1>
            <div className="animate-in border-t pt-5 delay-500 duration-1000 fill-mode-both fade-in slide-in-from-bottom-4" data-testid="autor-ganador">
              <p className="text-3xl font-medium">{ganador.participante}</p>
              <p className="mt-1 text-2xl text-muted-foreground">
                {ganador.area} · {ganador.ciudad}
              </p>
            </div>
            <p className="line-clamp-3 text-xl leading-relaxed text-foreground/80">{ganador.significado}</p>
          </div>
        </div>
      )}

      {paso === total - 1 && (
        <div key="podio" className="w-full max-w-7xl animate-in duration-700 fade-in" data-testid="podio">
          <h1 className="mb-10 text-center text-6xl font-semibold">Ganadores</h1>
          <div className="grid items-end gap-6 md:grid-cols-3">
            {[2, 1, 3].map((l) => {
              const g = porLugar(l);
              if (!g) return <div key={l} />;
              return (
                <div key={l} className={cn("rounded-3xl border bg-card p-6 text-center shadow-sm", l === 1 && "border-primary md:-translate-y-6 md:p-8")}>
                  <p className={cn("text-xl font-semibold uppercase", l === 1 ? "text-primary" : "text-muted-foreground")}>{LUGAR[l]}</p>
                  <div className={cn("mx-auto mt-4 flex items-center justify-center rounded-2xl bg-lienzo-logo p-4", l === 1 ? "h-56" : "h-44")}>
                    {g.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                      <img src={g.logoUrl} alt={`Logo de ${g.nombre}`} className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                  <p className={cn("mt-4 font-heading font-semibold", l === 1 ? "text-4xl" : "text-3xl")}>{g.nombre}</p>
                  <p className="mt-2 text-lg text-muted-foreground">{g.participante}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="fixed bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
        {paso + 1} / {total} · → o clic para avanzar · ← regresar · Esc galería
      </p>
    </main>
  );
}
