"use client";

import { useState } from "react";
import { FolderDownIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { prepararZipLogos } from "@/app/admin/(panel)/propuestas/acciones";
import { Button } from "@/components/ui/button";

/**
 * Descarga un ZIP con los logos de las propuestas filtradas ("001 - Nombre.png").
 * El ZIP se arma en el navegador: el servidor solo entrega URLs firmadas de corta
 * duración (así no se topa con el límite de tamaño de respuesta de Vercel).
 */
export function BotonZipLogos({ query }: { query: string }) {
  const [progreso, setProgreso] = useState<string | null>(null);

  async function descargar() {
    setProgreso("Preparando…");
    try {
      const r = await prepararZipLogos(query);
      if (!r.ok) throw new Error(r.error);
      if (r.data.length === 0) {
        toast.info("No hay logos que descargar con estos filtros.");
        return;
      }
      const { zip } = await import("fflate");
      const archivos: Record<string, Uint8Array> = {};
      let hechos = 0;
      // Descargas en paralelo, de 4 en 4.
      for (let i = 0; i < r.data.length; i += 4) {
        await Promise.all(
          r.data.slice(i, i + 4).map(async ({ nombre, url }) => {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`No se pudo descargar ${nombre}.`);
            archivos[nombre] = new Uint8Array(await resp.arrayBuffer());
            setProgreso(`Descargando ${++hechos} de ${r.data.length}…`);
          }),
        );
      }
      setProgreso("Comprimiendo…");
      // level 0: PNG/JPG ya vienen comprimidos.
      const datos = await new Promise<Uint8Array>((ok, mal) =>
        zip(archivos, { level: 0 }, (err, res) => (err ? mal(err) : ok(res))),
      );
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(new Blob([datos as BlobPart], { type: "application/zip" }));
      enlace.download = "Concurso Identidad - Logos.zip";
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
      toast.success(`ZIP con ${r.data.length} logo${r.data.length === 1 ? "" : "s"} listo.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el ZIP.");
    } finally {
      setProgreso(null);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={descargar} disabled={progreso !== null} data-testid="descargar-zip">
      {progreso ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <FolderDownIcon data-icon="inline-start" />}
      {progreso ?? "Descargar logos"}
    </Button>
  );
}
