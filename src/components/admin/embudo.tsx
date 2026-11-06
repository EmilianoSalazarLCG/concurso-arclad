import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EtapaEmbudo = {
  id?: string;
  numero: number;
  nombre: string;
  estado: "pendiente" | "abierta" | "cerrada" | string;
  top_n: number;
  propuestas: number;
};

const ESTADO = { pendiente: "Pendiente", abierta: "Votando", cerrada: "Cerrada" } as Record<string, string>;

/**
 * Línea de tiempo del embudo: Todas → Top 15 → Top 5 → Top 3.
 * La primera etapa son las propuestas activas; cada ronda reduce al top_n.
 */
export function Embudo({ activas, rondas, compacto = false }: { activas: number; rondas: EtapaEmbudo[]; compacto?: boolean }) {
  const etapas = [
    { clave: "todas", titulo: "Todas", cifra: activas, detalle: "propuestas activas", estado: "fuente" as const },
    ...rondas.map((r) => ({
      clave: r.id ?? String(r.numero),
      titulo: `Top ${r.top_n}`,
      cifra: r.top_n,
      detalle: `Ronda ${r.numero} · ${ESTADO[r.estado] ?? r.estado}`,
      estado: r.estado,
    })),
  ];
  return (
    <ol className={cn("grid gap-3", compacto ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 lg:grid-cols-4")} aria-label="Embudo del concurso" data-testid="embudo">
      {etapas.map((e, i) => {
        const activa = e.estado === "abierta";
        const hecha = e.estado === "cerrada";
        const final = i === etapas.length - 1;
        return (
          <li
            key={e.clave}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-card px-4 py-3.5 shadow-xs",
              activa && "border-primary/50 ring-2 ring-primary/20",
              final && "border-oro/50",
            )}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-1",
                activa ? "bg-primary" : hecha ? "bg-primary/40" : final ? "bg-oro" : e.estado === "fuente" ? "bg-tinta" : "bg-border",
              )}
              aria-hidden
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{e.titulo}</p>
              {hecha && <CheckIcon className="size-4 text-primary" aria-label="Cerrada" />}
              {activa && <span className="size-2 animate-brillo rounded-full bg-primary" aria-label="En votación" />}
            </div>
            <p className={cn("mt-1 font-heading text-3xl leading-none font-semibold cifras", final && "text-oro-foreground")}>{e.cifra}</p>
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{e.detalle}</p>
          </li>
        );
      })}
    </ol>
  );
}
