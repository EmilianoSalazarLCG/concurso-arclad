"use client";

import { useState } from "react";
import { Loader2Icon, PackageIcon } from "lucide-react";
import { toast } from "sonner";
import { paqueteAgencia } from "@/app/admin/(panel)/ganadores/acciones";
import { Button } from "@/components/ui/button";

/** ZIP armado en el navegador: logos originales del Top 3 + Excel con los datos. */
export function PaqueteAgencia() {
  const [estado, setEstado] = useState<string | null>(null);

  async function descargar() {
    setEstado("Preparando…");
    try {
      const r = await paqueteAgencia();
      if (!r.ok) throw new Error(r.error);
      const archivos: Record<string, Uint8Array> = {
        "Concurso Identidad - Ganadores.xlsx": Uint8Array.from(atob(r.data.excel), (c) => c.charCodeAt(0)),
      };
      for (const l of r.data.logos) {
        setEstado(`Descargando ${l.nombre}…`);
        const resp = await fetch(l.url);
        if (!resp.ok) throw new Error(`No se pudo descargar ${l.nombre}.`);
        archivos[l.nombre] = new Uint8Array(await resp.arrayBuffer());
      }
      const { zipSync } = await import("fflate");
      const zip = zipSync(archivos, { level: 0 });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
      a.download = "Concurso Identidad - Paquete agencia.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      toast.success("Paquete listo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el paquete.");
    } finally {
      setEstado(null);
    }
  }

  return (
    <Button variant="oro" size="lg" onClick={descargar} disabled={estado !== null} data-testid="paquete-agencia">
      {estado ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <PackageIcon data-icon="inline-start" />}
      {estado ?? "Paquete para la agencia"}
    </Button>
  );
}
