"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { deshacer } from "@/app/admin/(panel)/rondas/[id]/resultados/acciones";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeshacerAvance({ rondaId, siguiente }: { rondaId: string; siguiente: number }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)} data-testid="deshacer-avance">
        <Undo2Icon data-icon="inline-start" /> Deshacer avance
      </Button>
      <Dialog open={abierto} onOpenChange={(o) => !pendiente && setAbierto(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">¿Deshacer el avance a la Ronda {siguiente}?</DialogTitle>
            <DialogDescription>
              Se quitan las propuestas de la Ronda {siguiente} y se borran las posiciones finales de esta ronda. Solo es
              posible mientras la Ronda {siguiente} siga pendiente y sin votos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pendiente} />}>Cancelar</DialogClose>
            <Button
              variant="destructive"
              disabled={pendiente}
              data-testid="confirmar-deshacer"
              onClick={() =>
                iniciar(async () => {
                  const r = await deshacer(rondaId);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success("Avance deshecho");
                  setAbierto(false);
                })
              }
            >
              {pendiente && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Deshacer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
