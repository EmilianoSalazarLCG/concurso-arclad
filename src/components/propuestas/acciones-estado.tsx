"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestoreIcon, BanIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { descartar, restaurar } from "@/app/admin/(panel)/propuestas/acciones";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Botones "Descartar" (con confirmación y motivo) y "Restaurar". */
export function AccionesEstado({
  id,
  folio,
  estado,
  bloqueo,
}: {
  id: string;
  folio: string;
  estado: "activa" | "descartada";
  /** Si existe, la propuesta no se puede descartar y se explica por qué. */
  bloqueo?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function confirmarDescarte() {
    setError(null);
    iniciar(async () => {
      const r = await descartar(id, motivo);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success(`Propuesta ${r.data.folio} descartada`);
      setAbierto(false);
      setMotivo("");
      router.refresh();
    });
  }

  function confirmarRestaurar() {
    iniciar(async () => {
      const r = await restaurar(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Propuesta ${r.data.folio} restaurada`);
      router.refresh();
    });
  }

  if (estado === "descartada") {
    return (
      <Button variant="outline" size="sm" onClick={confirmarRestaurar} disabled={pendiente} data-testid="restaurar">
        {pendiente ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <ArchiveRestoreIcon data-icon="inline-start" />}
        Restaurar
      </Button>
    );
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setAbierto(true)} data-testid="descartar">
        <BanIcon data-icon="inline-start" />
        Descartar
      </Button>
      <Dialog open={abierto} onOpenChange={(o) => !pendiente && setAbierto(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">¿Descartar la propuesta {folio}?</DialogTitle>
            <DialogDescription>
              Seguirá visible en el historial con la etiqueta «Descartada» y podrás restaurarla después. No participará
              en las rondas.
            </DialogDescription>
          </DialogHeader>

          {bloqueo ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="bloqueo-descarte">
              No se puede descartar. {bloqueo}
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="motivo">
                Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="motivo"
                rows={3}
                maxLength={500}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. propuesta duplicada del folio 004"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pendiente} />}>Cancelar</DialogClose>
            {!bloqueo && (
              <Button variant="destructive" onClick={confirmarDescarte} disabled={pendiente} data-testid="confirmar-descarte">
                {pendiente && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                Descartar propuesta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
