"use client";

import { useEffect, useState } from "react";
import { TrophyIcon } from "lucide-react";
import { cargarGanadoresReunion } from "@/app/admin/reunion/acciones";
import { PatronGeometrico } from "@/components/marca/patron";
import { Skeleton } from "@/components/ui/skeleton";
import type { GanadorReunion } from "@/lib/datos/reunion";
import { cn } from "@/lib/utils";

const LUGAR: Record<number, string> = { 1: "1er lugar", 2: "2º lugar", 3: "3er lugar" };
const MEDALLA: Record<number, string> = { 1: "bg-oro text-tinta", 2: "bg-plata text-tinta", 3: "bg-bronce text-white" };
const PEDESTAL: Record<number, string> = { 1: "h-40 bg-oro", 2: "h-28 bg-plata", 3: "h-20 bg-bronce" };

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

  const listos = Boolean(ganadores?.length);
  useEffect(() => {
    if (!listos) return; // no avanza mientras cargan los ganadores
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
  }, [total, listos]);

  if (ganadores === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center gap-10 px-16 pt-24">
        <Skeleton className="aspect-square w-[min(40vw,32rem)] rounded-3xl" />
        <div className="w-[min(40vw,32rem)] space-y-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </main>
    );
  }
  if (!ganadores?.length) {
    return <main className="flex flex-1 items-center justify-center font-heading text-4xl">Los ganadores aún no están confirmados.</main>;
  }

  const n = ganadores.length;
  const lugarActual = paso >= 1 && paso <= n ? n + 1 - paso : null; // 3, 2, 1
  const ganador = lugarActual ? ganadores.find((g) => g.lugar === lugarActual) : null;
  const porLugar = (l: number) => ganadores.find((g) => g.lugar === l);

  return (
    <main
      className="relative isolate flex flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden px-8 pt-24 pb-16 select-none"
      onClick={() => setPaso((p) => Math.min(p + 1, total - 1))}
      data-testid="revelar"
      data-paso={paso}
    >
      <PatronGeometrico className="-z-10 text-foreground/[0.05]" />
      <div className="absolute top-1/2 left-1/2 -z-10 size-[42rem] -translate-x-1/2 -translate-y-1/2 animate-brillo rounded-full bg-oro/10 blur-3xl" aria-hidden />

      {paso === 0 && (
        <div key="portada" className="animate-revelar text-center" data-testid="portada">
          <span className="mx-auto flex size-28 items-center justify-center rounded-full bg-oro/15 ring-1 ring-oro/40">
            <TrophyIcon className="size-14 text-oro" strokeWidth={1.25} />
          </span>
          <p className="mt-8 text-sm font-semibold tracking-[0.3em] text-oro uppercase">Concurso Identidad</p>
          <h1 className="mt-4 text-7xl font-semibold xl:text-8xl">
            Los <em className="font-medium text-oro">ganadores</em>
          </h1>
          <p className="mt-8 text-2xl text-muted-foreground">Presiona → para revelar el {LUGAR[n]}</p>
        </div>
      )}

      {ganador && (
        <div
          key={`lugar-${ganador.lugar}`}
          className="grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
          data-testid="lugar-revelado"
          data-lugar={ganador.lugar}
        >
          <div
            className={cn(
              "flex aspect-square max-h-[62vh] animate-revelar items-center justify-center rounded-[2rem] bg-lienzo-logo p-12 shadow-lg",
              ganador.lugar === 1 ? "ring-4 ring-oro/60 shadow-[0_0_80px_color-mix(in_oklab,var(--oro)_38%,transparent)]" : "ring-1 ring-border",
            )}
          >
            {ganador.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada
              <img src={ganador.logoUrl} alt={`Logo de ${ganador.nombre}`} className="max-h-full max-w-full object-contain" />
            )}
          </div>
          <div className="space-y-6">
            <p className="flex animate-revelar items-center gap-4 [animation-delay:150ms]">
              <span className={cn("flex size-14 items-center justify-center rounded-full font-heading text-3xl font-semibold shadow-md cifras", MEDALLA[ganador.lugar])}>
                {ganador.lugar}
              </span>
              <span className={cn("text-3xl font-semibold tracking-[0.18em] uppercase", ganador.lugar === 1 ? "text-oro" : "text-muted-foreground")}>
                {LUGAR[ganador.lugar]}
              </span>
            </p>
            <h1 className="animate-revelar text-7xl leading-[1.02] font-semibold break-words [animation-delay:300ms] xl:text-8xl" data-testid="nombre-ganador">
              {ganador.nombre}
            </h1>
            <div className="animate-revelar border-t border-oro/40 pt-6 [animation-delay:900ms]" data-testid="autor-ganador">
              <p className="text-3xl font-semibold">{ganador.participante}</p>
              <p className="mt-1 text-2xl text-muted-foreground">
                {ganador.area} · {ganador.ciudad}
              </p>
            </div>
            <p className="line-clamp-3 animate-revelar text-xl leading-relaxed text-foreground/75 [animation-delay:1200ms]">{ganador.significado}</p>
          </div>
        </div>
      )}

      {paso === total - 1 && (
        <div key="podio" className="w-full max-w-6xl" data-testid="podio">
          <h1 className="mb-12 animate-revelar text-center text-6xl font-semibold">
            Nuestros <em className="font-medium text-oro">ganadores</em>
          </h1>
          <div className="grid items-end gap-6 md:grid-cols-3">
            {[2, 1, 3].map((l, i) => {
              const g = porLugar(l);
              if (!g) return <div key={l} />;
              return (
                <div key={l} className="animate-revelar" style={{ animationDelay: `${200 + i * 250}ms` }}>
                  <div className={cn("rounded-3xl border bg-card p-6 text-center shadow-lg", l === 1 && "border-oro/60 ring-2 ring-oro/30")}>
                    <div className={cn("mx-auto flex items-center justify-center rounded-2xl bg-lienzo-logo p-4", l === 1 ? "h-52" : "h-40")}>
                      {g.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                        <img src={g.logoUrl} alt={`Logo de ${g.nombre}`} className="max-h-full max-w-full object-contain" />
                      )}
                    </div>
                    <p className={cn("mt-5 font-heading font-semibold", l === 1 ? "text-4xl" : "text-3xl")}>{g.nombre}</p>
                    <p className="mt-1 text-lg text-muted-foreground">{g.participante}</p>
                  </div>
                  <div className={cn("mx-6 mt-3 flex items-start justify-center rounded-t-2xl pt-3 font-heading text-4xl font-semibold text-tinta/80 cifras", PEDESTAL[l])}>
                    {l}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="fixed bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground cifras">
        {paso + 1} / {total} · → o clic para avanzar · ← regresar · Esc galería
      </p>
    </main>
  );
}
