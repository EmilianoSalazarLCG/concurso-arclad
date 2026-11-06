"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { limpiarLogosHuerfanos } from "@/app/admin/(panel)/mantenimiento/acciones";
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

function tamano(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LimpiezaHuerfanos({ cantidad, bytes, recientes }: { cantidad: number; bytes: number; recientes: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const archivos = (n: number) => `${n} archivo${n === 1 ? "" : "s"}`;

  function confirmar() {
    iniciar(async () => {
      const r = await limpiarLogosHuerfanos();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(r.data.borrados ? `Se borraron ${archivos(r.data.borrados)}.` : "No había archivos por borrar.");
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm" data-testid="resumen-huerfanos">
        {cantidad === 0 ? (
          <p>No hay logos huérfanos con más de 24 horas.</p>
        ) : (
          <p>
            <strong>{archivos(cantidad)}</strong> por borrar ({tamano(bytes)}).
          </p>
        )}
        {recientes > 0 && (
          <p className="mt-1 text-muted-foreground">
            {archivos(recientes)} sin propuesta de menos de 24 horas se conserva{recientes === 1 ? "" : "n"}.
          </p>
        )}
      </div>
      <Button variant="destructive" size="sm" disabled={cantidad === 0} onClick={() => setAbierto(true)} data-testid="limpiar-huerfanos">
        <Trash2Icon data-icon="inline-start" />
        Borrar {archivos(cantidad)}
      </Button>

      <Dialog open={abierto} onOpenChange={(o) => !pendiente && setAbierto(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">¿Borrar {archivos(cantidad)}?</DialogTitle>
            <DialogDescription>
              Se borrarán definitivamente de Storage. Ninguno pertenece a una propuesta; antes de borrar se vuelve a
              verificar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pendiente} />}>Cancelar</DialogClose>
            <Button variant="destructive" onClick={confirmar} disabled={pendiente} data-testid="confirmar-limpieza">
              {pendiente && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Borrar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
