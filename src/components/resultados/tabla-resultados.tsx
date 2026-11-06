"use client";

import { Fragment, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { detalle } from "@/app/admin/(panel)/rondas/[id]/resultados/acciones";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DetalleGerente, FilaResultado } from "@/lib/datos/resultados";
import { cn } from "@/lib/utils";

const f3 = (n: number) => String(n).padStart(3, "0");
const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : Number(n).toFixed(2));

/** Ranking con línea de corte, empates resaltados y detalle por gerente (solo admins). */
export function TablaResultados({
  rondaId,
  filas,
  criterios,
  pasan,
  empatadas,
  textoCorte,
}: {
  rondaId: string;
  filas: FilaResultado[];
  criterios: { id: string; nombre: string }[];
  /** Propuestas que pasan (por ranking o por el avance ya realizado). */
  pasan: string[];
  empatadas: string[];
  textoCorte: string;
}) {
  const [abierta, setAbierta] = useState<FilaResultado | null>(null);
  const [datos, setDatos] = useState<DetalleGerente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pasanSet = new Set(pasan);
  const ultimaQuePasa = filas.reduce((u, f, i) => (pasanSet.has(f.propuesta_id) ? i : u), -1);

  async function abrir(f: FilaResultado) {
    setAbierta(f);
    setDatos(null);
    setError(null);
    const r = await detalle(rondaId, f.propuesta_id);
    if (r.ok) setDatos(r.data);
    else setError(r.error);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm" data-testid="tabla-resultados">
          <thead className="border-b bg-muted/60 text-left text-[0.7rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3.5">Pos.</th>
              <th className="px-3 py-3.5">Folio</th>
              <th className="px-3 py-3.5">Logo</th>
              <th className="px-3 py-3.5">Nombre propuesto</th>
              <th className="px-3 py-3.5">Autor</th>
              <th className="px-3 py-3.5 text-right">Promedio</th>
              {criterios.map((c) => (
                <th key={c.id} className="hidden px-3 py-3.5 text-right xl:table-cell" title={c.nombre}>
                  {c.nombre.split(" ")[0]}
                </th>
              ))}
              <th className="px-3 py-3.5 text-right">Gerentes</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <Fragment key={f.propuesta_id}>
                <tr
                  onClick={() => abrir(f)}
                  data-testid="fila-resultado"
                  data-pasa={pasanSet.has(f.propuesta_id)}
                  data-folio={f.folio}
                  data-posicion={f.posicion}
                  className={cn(
                    "cursor-pointer border-b transition-colors hover:bg-muted/50",
                    pasanSet.has(f.propuesta_id) && "bg-accent/30",
                    empatadas.includes(f.propuesta_id) && "bg-advertencia-fondo",
                  )}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg font-heading text-base font-semibold cifras",
                        f.posicion === 1 ? "bg-oro text-tinta" : pasanSet.has(f.propuesta_id) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {f.posicion}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-muted-foreground cifras">{f3(f.folio)}</td>
                  <td className="px-3 py-2">
                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border bg-lienzo-logo p-1">
                      {f.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                        <img src={f.logoUrl} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-heading text-base font-semibold">
                    {f.nombre_propuesto}
                    {empatadas.includes(f.propuesta_id) && (
                      <Badge variant="advertencia" className="ml-2">
                        Empate
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="block font-medium">{f.participante}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.area} · {f.ciudad}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
                        <div
                          className={cn("h-full rounded-full", pasanSet.has(f.propuesta_id) ? "bg-primary" : "bg-muted-foreground/40")}
                          style={{ width: `${((f.promedio_general ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-heading text-base font-semibold cifras" data-testid="promedio">
                        {num(f.promedio_general)}
                      </span>
                    </div>
                  </td>
                  {criterios.map((c) => (
                    <td key={c.id} className="hidden px-3 py-3 text-right text-muted-foreground cifras xl:table-cell">
                      {num(f.promedio_por_criterio.find((p) => p.criterio_id === c.id)?.promedio)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-medium cifras">{f.gerentes}</td>
                </tr>
                {i === ultimaQuePasa && i < filas.length - 1 && (
                  <tr data-testid="linea-corte">
                    <td colSpan={7 + criterios.length} className="p-0">
                      <div className="flex items-center gap-3 bg-card px-4 py-2">
                        <span className="h-0.5 flex-1 rounded-full bg-primary" />
                        <span className="rounded-full bg-primary px-3 py-1 text-[0.7rem] font-bold tracking-[0.1em] text-primary-foreground uppercase">↑ {textoCorte}</span>
                        <span className="h-0.5 flex-1 rounded-full bg-primary" />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={abierta !== null} onOpenChange={(o) => !o && setAbierta(null)}>
        {abierta && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {f3(abierta.folio)} · {abierta.nombre_propuesto}
              </DialogTitle>
              <DialogDescription>
                Posición {abierta.posicion} · promedio {num(abierta.promedio_general)} · calificaciones enviadas por gerente (solo admins)
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!datos && !error && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" /> Cargando…
              </p>
            )}
            {datos && (
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full text-sm" data-testid="detalle-gerentes">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Gerente</th>
                      {criterios.map((c) => (
                        <th key={c.id} className="px-2 py-2 text-right font-medium">
                          {c.nombre}
                        </th>
                      ))}
                      <th className="py-2 pl-2 text-right font-medium">Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {datos.map((d) => (
                      <tr key={d.votante}>
                        <td className="py-1.5 pr-3">{d.votante}</td>
                        {criterios.map((c) => (
                          <td key={c.id} className="px-2 py-1.5 text-right tabular-nums">
                            {d.puntajes[c.id] ?? "—"}
                          </td>
                        ))}
                        <td className="py-1.5 pl-2 text-right font-medium tabular-nums">{d.promedio.toFixed(2)}</td>
                      </tr>
                    ))}
                    {datos.length === 0 && (
                      <tr>
                        <td colSpan={criterios.length + 2} className="py-4 text-center text-muted-foreground">
                          Aún no hay votos enviados para esta propuesta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
