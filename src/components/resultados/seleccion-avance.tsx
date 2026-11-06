"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { pasar } from "@/app/admin/(panel)/rondas/[id]/resultados/acciones";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Fila = { id: string; posicion: number; folio: number; nombre: string; promedio: number | null; logoUrl: string | null };
const f3 = (n: number) => String(n).padStart(3, "0");

export function SeleccionAvance({
  rondaId,
  numeroSiguiente,
  topN,
  filas,
  preseleccion,
  empatadas,
  lugarEmpate,
}: {
  rondaId: string;
  numeroSiguiente: number;
  topN: number;
  filas: Fila[];
  preseleccion: string[];
  empatadas: string[];
  lugarEmpate: number | null;
}) {
  const router = useRouter();
  const [sel, setSel] = useState(() => new Set(preseleccion));
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const elegidas = filas.filter((f) => sel.has(f.id));
  const diferencia = elegidas.length - topN;

  function alternar(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      {lugarEmpate !== null && (
        <div className="flex gap-3 rounded-xl border border-advertencia/40 bg-advertencia-fondo px-4 py-3 text-advertencia-foreground" data-testid="aviso-empate">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Empate en el lugar {lugarEmpate}.</strong> Están preseleccionadas todas las empatadas; quita las que no deben pasar.
          </p>
        </div>
      )}

      <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <p className={cn("text-sm", diferencia !== 0 && "font-medium text-advertencia-foreground")} data-testid="conteo-seleccion">
          {elegidas.length} seleccionadas de {topN}
          {diferencia > 0 && ` · sobran ${diferencia}`}
          {diferencia < 0 && ` · faltan ${-diferencia}`}
        </p>
        <Button onClick={() => setConfirmar(true)} disabled={elegidas.length === 0} data-testid="continuar-avance">
          Revisar y confirmar <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>

      <ul className="divide-y rounded-xl border bg-card shadow-sm" data-testid="lista-avance">
        {filas.map((f) => (
          <li key={f.id} className={cn(empatadas.includes(f.id) && "bg-advertencia-fondo")}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={sel.has(f.id)}
                onChange={() => alternar(f.id)}
                data-testid="check-avance"
                data-folio={f.folio}
              />
              <span className="w-8 font-heading text-lg font-semibold tabular-nums">{f.posicion}</span>
              <span className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-lienzo-logo">
                {f.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                  <img src={f.logoUrl} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{f.nombre}</span> <span className="font-mono text-xs text-muted-foreground">{f3(f.folio)}</span>
                {empatadas.includes(f.id) && <span className="ml-2 text-xs font-medium text-advertencia-foreground">Empate</span>}
              </span>
              <span className="font-semibold tabular-nums">{f.promedio === null ? "—" : f.promedio.toFixed(2)}</span>
            </label>
          </li>
        ))}
      </ul>

      <Dialog open={confirmar} onOpenChange={(o) => !pendiente && setConfirmar(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">¿Pasar {elegidas.length} propuestas a la Ronda {numeroSiguiente}?</DialogTitle>
            <DialogDescription>
              Se guardará la posición final de esta ronda y la Ronda {numeroSiguiente} quedará pendiente, lista para abrirse.
              {diferencia !== 0 && ` Ojo: normalmente pasan ${topN}.`}
            </DialogDescription>
          </DialogHeader>
          <ol className="max-h-64 list-decimal space-y-0.5 overflow-auto pl-6 text-sm" data-testid="resumen-avance">
            {elegidas.map((f) => (
              <li key={f.id}>
                {f.nombre} <span className="text-muted-foreground">({f3(f.folio)})</span>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pendiente} />}>Cancelar</DialogClose>
            <Button
              disabled={pendiente}
              data-testid="confirmar-avance"
              onClick={() =>
                iniciar(async () => {
                  const r = await pasar(rondaId, elegidas.map((f) => f.id));
                  if (!r.ok) return void toast.error(r.error);
                  toast.success(`${r.data} propuestas pasaron a la Ronda ${numeroSiguiente}`);
                  router.push(`/admin/rondas/${rondaId}/resultados`);
                })
              }
            >
              {pendiente && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
