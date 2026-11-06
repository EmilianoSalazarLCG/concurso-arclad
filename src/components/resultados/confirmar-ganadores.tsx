"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, TrophyIcon } from "lucide-react";
import { toast } from "sonner";
import { confirmar } from "@/app/admin/(panel)/ganadores/acciones";
import { Button } from "@/components/ui/button";
import type { FilaResultado } from "@/lib/datos/resultados";

const LUGARES = ["1er lugar", "2º lugar", "3er lugar"];

/** Elegir y confirmar el orden final del Top 3 (resuelve empates). */
export function ConfirmarGanadores({
  rondaId,
  opciones,
  inicial,
  cambiar = false,
}: {
  rondaId: string;
  opciones: FilaResultado[];
  inicial: string[];
  cambiar?: boolean;
}) {
  const [abierto, setAbierto] = useState(!cambiar);
  const [ids, setIds] = useState<string[]>(inicial);
  const [pendiente, iniciar] = useTransition();
  const repetidos = new Set(ids).size !== ids.length;

  if (!abierto) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setAbierto(true)} data-testid="cambiar-ganadores">
        Cambiar el orden de los ganadores
      </Button>
    );
  }

  return (
    <section className="max-w-2xl space-y-5 rounded-2xl border bg-card p-6 shadow-sm" data-testid="form-ganadores">
      <div>
        <h2 className="text-xl font-semibold">{cambiar ? "Cambiar ganadores" : "Confirmar ganadores"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preseleccionados según el ranking. Ajusta el orden si hay empate y confirma.
        </p>
      </div>
      {LUGARES.map((lugar, i) => (
        <label key={lugar} className="flex flex-wrap items-center gap-3">
          <span className="flex w-28 items-center gap-2 text-sm font-semibold">
            <span className={["size-3 rounded-full", i === 0 ? "bg-oro" : i === 1 ? "bg-plata" : "bg-bronce"].join(" ")} aria-hidden />
            {lugar}
          </span>
          <select
            className="h-10 min-w-0 flex-1 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm font-medium shadow-xs"
            value={ids[i] ?? ""}
            onChange={(e) => setIds((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
            data-testid={`lugar-${i + 1}`}
          >
            {opciones.map((o) => (
              <option key={o.propuesta_id} value={o.propuesta_id}>
                {o.posicion}. {o.nombre_propuesto} · {o.promedio_general?.toFixed(2) ?? "—"}
              </option>
            ))}
          </select>
        </label>
      ))}
      {repetidos && <p className="text-sm text-destructive">Cada lugar debe tener una propuesta distinta.</p>}
      <Button
        disabled={pendiente || repetidos || ids.length !== 3}
        data-testid="confirmar-ganadores"
        onClick={() =>
          iniciar(async () => {
            const r = await confirmar(rondaId, ids);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Ganadores confirmados");
            if (cambiar) setAbierto(false);
          })
        }
      >
        {pendiente ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <TrophyIcon data-icon="inline-start" />}
        Confirmar ganadores
      </Button>
    </section>
  );
}
