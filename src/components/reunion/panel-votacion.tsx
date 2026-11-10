"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, CircleDashedIcon, CircleIcon } from "lucide-react";
import { consultarAvanceVotacion } from "@/app/admin/reunion/acciones";
import { Skeleton } from "@/components/ui/skeleton";
import type { AvanceReunion } from "@/lib/datos/reunion";
import { cn } from "@/lib/utils";

const ACTUALIZAR_CADA_MS = 4000;

/**
 * QR + link a /votar y avance de la votación en vivo (sin calificaciones).
 * Se actualiza solo cada 4 s sin recargar la página.
 */
export function PanelVotacion({ urlVotar, linkCorto, qrSvg }: { urlVotar: string; linkCorto: string; qrSvg: string }) {
  const [avance, setAvance] = useState<AvanceReunion | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const consultar = async () => {
      const r = await consultarAvanceVotacion();
      if (!vivo) return;
      if (r.ok) {
        setAvance(r.data);
        setError(false);
        setActualizado(new Date());
      } else {
        setError(true);
      }
      t = setTimeout(consultar, ACTUALIZAR_CADA_MS);
    };
    void consultar();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);

  const yaVotaron = avance?.votantes.filter((v) => v.estado === "completo") ?? [];
  const faltan = avance?.votantes.filter((v) => v.estado !== "completo") ?? [];
  const porcentaje = avance ? Math.round((avance.completos / Math.max(1, avance.totalVotantes)) * 100) : 0;

  return (
    <main className="grid flex-1 gap-14 px-8 pt-28 pb-12 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:px-16" data-testid="panel-votacion">
      <section className="flex flex-col items-center gap-5">
        <div
          className="w-[min(44vh,27rem)] rounded-[2rem] bg-lienzo-logo p-6 shadow-lg ring-1 ring-border [&_svg]:h-auto [&_svg]:w-full"
          aria-label={`Código QR para votar: ${urlVotar}`}
          role="img"
          data-testid="qr"
          // SVG generado en el servidor por la librería qrcode a partir de nuestra propia URL.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="text-center font-heading text-3xl font-semibold break-all xl:text-4xl" data-testid="link-votar">
          {linkCorto}
        </p>
        <p className="text-lg text-muted-foreground">Escanea el código o abre el link para votar</p>
      </section>

      <section className="min-w-0 space-y-8">
        {avance === undefined ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-6 w-72" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        ) : avance === null ? (
          <p className="text-3xl font-semibold">No hay votación abierta.</p>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
                Ronda {avance.ronda.numero} · {avance.ronda.nombre} · {avance.totalPropuestas} propuestas
              </p>
              <p className="mt-3 font-heading text-6xl leading-[1.02] font-semibold cifras xl:text-7xl" data-testid="resumen-avance">
                {avance.completos} de {avance.totalVotantes} {avance.etiqueta} han votado
              </p>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${porcentaje}%` }} />
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <Lista titulo={`Ya votaron (${yaVotaron.length})`} testid="ya-votaron">
                {yaVotaron.map((v) => (
                  <li key={v.id} className="flex items-center gap-3">
                    <CheckCircle2Icon className="size-6 shrink-0 text-primary" />
                    {v.nombre}
                  </li>
                ))}
              </Lista>
              <Lista titulo={`Faltan (${faltan.length})`} testid="faltan">
                {faltan.map((v) => (
                  <li key={v.id} className={cn("flex items-center gap-3", v.estado === "pendiente" && "text-muted-foreground")}>
                    {v.estado === "en-proceso" ? (
                      <CircleDashedIcon className="size-6 shrink-0 text-advertencia" />
                    ) : (
                      <CircleIcon className="size-6 shrink-0" />
                    )}
                    {v.nombre}
                    {v.estado === "en-proceso" && <span className="text-base text-muted-foreground">(votando…)</span>}
                  </li>
                ))}
              </Lista>
            </div>
          </>
        )}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {error
            ? "Sin conexión; reintentando…"
            : actualizado && `Se actualiza solo · última actualización ${actualizado.toLocaleTimeString("es-MX")}`}
        </p>
      </section>
    </main>
  );
}

function Lista({ titulo, testid, children }: { titulo: string; testid: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">{titulo}</h2>
      <ul className="max-h-[45vh] space-y-2.5 overflow-y-auto pr-2 text-2xl" data-testid={testid}>
        {children}
      </ul>
    </div>
  );
}
