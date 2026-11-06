"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, LockIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { abrir, cerrar } from "@/app/admin/(panel)/rondas/acciones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Accion = "abrir" | "cerrar" | "reabrir";

const TEXTOS: Record<Accion, { boton: string; titulo: string; descripcion: string; confirmar: string }> = {
  abrir: {
    boton: "Abrir votación",
    titulo: "¿Abrir la votación?",
    descripcion: "Los gerentes podrán calificar desde el link de votación. Mientras esté abierta no se pueden agregar ni quitar propuestas.",
    confirmar: "Abrir votación",
  },
  cerrar: {
    boton: "Cerrar votación",
    titulo: "¿Cerrar la votación?",
    descripcion: "Nadie podrá calificar ni enviar. Solo cuentan los votos ya enviados; el avance sin enviar no cuenta.",
    confirmar: "Cerrar votación",
  },
  reabrir: {
    boton: "Reabrir",
    titulo: "¿Reabrir la votación?",
    descripcion:
      "Atención: los gerentes podrán volver a cambiar y re-enviar sus calificaciones, y los resultados pueden cambiar. Úsalo solo si se cerró por error o falta alguien por votar.",
    confirmar: "Sí, reabrir",
  },
};

export function AccionesRonda({
  rondaId,
  numero,
  estado,
  propuestas,
  otraAbierta,
}: {
  rondaId: string;
  numero: number;
  estado: "pendiente" | "abierta" | "cerrada";
  propuestas: number;
  otraAbierta: boolean;
}) {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [pendiente, iniciar] = useTransition();
  const disponible: Accion = estado === "pendiente" ? "abrir" : estado === "abierta" ? "cerrar" : "reabrir";
  const motivoBloqueo =
    disponible !== "cerrar"
      ? propuestas === 0
        ? "Agrega propuestas antes de abrir."
        : otraAbierta
          ? "Ya hay otra ronda abierta."
          : null
      : null;

  function confirmar() {
    if (!accion) return;
    iniciar(async () => {
      const r = await (accion === "cerrar" ? cerrar(rondaId) : abrir(rondaId));
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(accion === "cerrar" ? `Ronda ${numero} cerrada` : `Ronda ${numero} abierta`);
      setAccion(null);
    });
  }

  const Icono = disponible === "abrir" ? PlayIcon : disponible === "cerrar" ? LockIcon : RotateCcwIcon;
  const t = accion ? TEXTOS[accion] : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant={disponible === "cerrar" ? "destructive" : disponible === "reabrir" ? "outline" : "default"}
        onClick={() => setAccion(disponible)}
        disabled={Boolean(motivoBloqueo)}
        data-testid={`ronda-${numero}-${disponible}`}
      >
        <Icono data-icon="inline-start" />
        {TEXTOS[disponible].boton}
      </Button>
      {motivoBloqueo && <span className="text-xs text-muted-foreground">{motivoBloqueo}</span>}

      <Dialog open={accion !== null} onOpenChange={(o) => !pendiente && !o && setAccion(null)}>
        {t && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {t.titulo} <span className="text-muted-foreground">(Ronda {numero})</span>
              </DialogTitle>
              <DialogDescription>{t.descripcion}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={pendiente} />}>Cancelar</DialogClose>
              <Button
                variant={accion === "abrir" ? "default" : "destructive"}
                onClick={confirmar}
                disabled={pendiente}
                data-testid="confirmar-ronda"
              >
                {pendiente && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                {t.confirmar}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
