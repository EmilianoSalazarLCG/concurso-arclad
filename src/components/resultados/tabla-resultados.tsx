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
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm" data-testid="tabla-resultados">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">Pos.</th>
              <th className="px-3 py-3 font-medium">Folio</th>
              <th className="px-3 py-3 font-medium">Logo</th>
              <th className="px-3 py-3 font-medium">Nombre propuesto</th>
              <th className="px-3 py-3 font-medium">Autor</th>
              <th className="px-3 py-3 text-right font-medium">Promedio</th>
              {criterios.map((c) => (
                <th key={c.id} className="hidden px-3 py-3 text-right font-medium xl:table-cell" title={c.nombre}>
                  {c.nombre.split(" ")[0]}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-medium">Gerentes</th>
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
                    "cursor-pointer border-b hover:bg-muted/40",
                    pasanSet.has(f.propuesta_id) && "bg-accent/40",
                    empatadas.includes(f.propuesta_id) && "bg-advertencia-fondo",
                  )}
                >
                  <td className="px-3 py-2 font-heading text-lg font-semibold tabular-nums">{f.posicion}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{f3(f.folio)}</td>
                  <td className="px-3 py-2">
                    <div className="flex size-11 items-center justify-center overflow-hidden rounded-md border bg-lienzo-logo">
                      {f.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                        <img src={f.logoUrl} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {f.nombre_propuesto}
                    {empatadas.includes(f.propuesta_id) && (
                      <Badge variant="outline" className="ml-2 border-advertencia text-advertencia-foreground">
                        Empate
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="block">{f.participante}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.area} · {f.ciudad}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums" data-testid="promedio">
                    {num(f.promedio_general)}
                  </td>
                  {criterios.map((c) => (
                    <td key={c.id} className="hidden px-3 py-2 text-right text-muted-foreground tabular-nums xl:table-cell">
                      {num(f.promedio_por_criterio.find((p) => p.criterio_id === c.id)?.promedio)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums">{f.gerentes}</td>
                </tr>
                {i === ultimaQuePasa && i < filas.length - 1 && (
                  <tr data-testid="linea-corte">
                    <td colSpan={7 + criterios.length} className="border-y-2 border-primary bg-primary/10 px-3 py-1.5 text-center text-xs font-semibold tracking-wide text-primary uppercase">
                      ↑ {textoCorte}
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
