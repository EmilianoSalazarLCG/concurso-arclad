"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarCriterio } from "@/app/admin/(panel)/mantenimiento/acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CriterioFila = { id: string; nombre: string; descripcion: string | null; activo: boolean };

/**
 * Activa o desactiva criterios de votación. Desactivar no borra calificaciones: el criterio
 * deja de pedirse en /votar y de contar en envíos y resultados (todo filtra por activo).
 */
export function CriteriosVotacion({ criterios }: { criterios: CriterioFila[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const activos = criterios.filter((c) => c.activo).length;

  function cambiar(c: CriterioFila) {
    const accion = c.activo ? "quitar" : "volver a usar";
    const aviso = c.activo
      ? "Dejará de pedirse en la votación y de contar en los resultados. Las calificaciones ya dadas se conservan por si lo vuelves a activar."
      : "Se volverá a pedir en la votación; quien ya envió su voto tendrá que calificarlo y enviar de nuevo para que cuente.";
    if (!window.confirm("¿Seguro que quieres " + accion + " el criterio «" + c.nombre + "»?\n\n" + aviso)) return;
    setError(null);
    iniciar(async () => {
      const r = await cambiarCriterio(c.id, !c.activo);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3" data-testid="criterios-votacion">
      <ul className="divide-y rounded-xl border">
        {criterios.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className={c.activo ? "font-semibold" : "font-semibold text-muted-foreground line-through"}>{c.nombre}</p>
              {c.descripcion && <p className="text-sm text-muted-foreground">{c.descripcion}</p>}
            </div>
            {c.activo ? <Badge>Activo</Badge> : <Badge variant="outline">Quitado</Badge>}
            <Button
              variant="outline"
              size="sm"
              disabled={pendiente || (c.activo && activos <= 1)}
              onClick={() => cambiar(c)}
              data-testid="cambiar-criterio"
            >
              {c.activo ? "Quitar" : "Volver a usar"}
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {activos} criterio{activos === 1 ? "" : "s"} activo{activos === 1 ? "" : "s"} en la votación.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
