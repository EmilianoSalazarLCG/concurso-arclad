"use client";

import { useTransition } from "react";
import { ListPlusIcon, Loader2Icon, MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { agregar, agregarTodas, quitar } from "@/app/admin/(panel)/rondas/acciones";
import { Button } from "@/components/ui/button";

type Item = { id: string; folio: number; nombre_propuesto: string; participante_nombre: string };
const f3 = (n: number) => String(n).padStart(3, "0");

/** Asignar/quitar propuestas de una ronda (solo mientras está pendiente). */
export function PropuestasRonda({
  rondaId,
  editable,
  mostrarAgregarTodas,
  asignadas,
  disponibles,
}: {
  rondaId: string;
  editable: boolean;
  mostrarAgregarTodas: boolean;
  asignadas: Item[];
  disponibles: Item[];
}) {
  const [pendiente, iniciar] = useTransition();

  function ejecutar(fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>, exito: string) {
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "No se pudo completar.");
      else toast.success(exito);
    });
  }

  return (
    <div className="space-y-6">
      {editable && mostrarAgregarTodas && (
        <Button
          onClick={() => ejecutar(() => agregarTodas(rondaId), "Se agregaron todas las propuestas activas")}
          disabled={pendiente || disponibles.length === 0}
          data-testid="agregar-todas"
        >
          {pendiente ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <ListPlusIcon data-icon="inline-start" />}
          Agregar todas las propuestas activas
        </Button>
      )}
      {!editable && (
        <p className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Las propuestas solo se pueden agregar o quitar mientras la ronda está pendiente.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Lista titulo={`En la ronda (${asignadas.length})`} testid="asignadas" vacio="Aún no hay propuestas en esta ronda.">
          {asignadas.map((p) => (
            <Fila key={p.id} p={p}>
              {editable && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendiente}
                  onClick={() => ejecutar(() => quitar(rondaId, p.id), `Propuesta ${f3(p.folio)} quitada`)}
                  aria-label={`Quitar ${p.nombre_propuesto}`}
                  data-testid="quitar"
                >
                  <MinusIcon data-icon="inline-start" /> Quitar
                </Button>
              )}
            </Fila>
          ))}
        </Lista>
        {editable && (
          <Lista titulo={`Disponibles (${disponibles.length})`} testid="disponibles" vacio="Todas las propuestas activas ya están en la ronda.">
            {disponibles.map((p) => (
              <Fila key={p.id} p={p}>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendiente}
                  onClick={() => ejecutar(() => agregar(rondaId, p.id), `Propuesta ${f3(p.folio)} agregada`)}
                  aria-label={`Agregar ${p.nombre_propuesto}`}
                  data-testid="agregar"
                >
                  <PlusIcon data-icon="inline-start" /> Agregar
                </Button>
              </Fila>
            ))}
          </Lista>
        )}
      </div>
    </div>
  );
}

function Lista({ titulo, testid, vacio, children }: { titulo: string; testid: string; vacio: string; children: React.ReactNode[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <h2 className="border-b bg-muted/50 px-5 py-3.5 text-lg font-semibold">{titulo}</h2>
      {children.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="divide-y" data-testid={testid}>
          {children}
        </ul>
      )}
    </section>
  );
}

function Fila({ p, children }: { p: Item; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40" data-folio={p.folio}>
      <span className="font-semibold text-muted-foreground cifras">{f3(p.folio)}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{p.nombre_propuesto}</span>
        <span className="text-muted-foreground"> · {p.participante_nombre}</span>
      </span>
      {children}
    </li>
  );
}
