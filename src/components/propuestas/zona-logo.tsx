"use client";

import { useEffect, useEffectEvent, useRef, useState, type Ref } from "react";
import { ClipboardPasteIcon, ImageUpIcon, Loader2Icon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOGO_MAX_BYTES } from "@/lib/validacion/propuesta";
import { cn } from "@/lib/utils";

export type LogoSeleccionado = {
  /** Archivo nuevo por subir; null = logo actual ya guardado (al editar). */
  archivo: File | null;
  /** Object URL (logo nuevo) o URL firmada (logo actual) para la vista previa. */
  url: string;
  /** Texto informativo: "PNG · 120 KB · 512×512 px" o "Logo actual". */
  descripcion: string;
  convertido?: boolean;
};

const TIPOS_DIRECTOS = ["image/png", "image/jpeg"];

function formatearTamano(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Prepara una imagen para subirla: verifica que se pueda leer y, si no es PNG/JPG
 * (p. ej. TIFF/BMP/WebP del portapapeles), la convierte a PNG en el navegador.
 */
async function prepararImagen(blob: Blob): Promise<LogoSeleccionado> {
  if (blob.type && !blob.type.startsWith("image/")) throw new Error("El archivo no es una imagen. Usa PNG o JPG.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("No se pudo leer la imagen. Usa un archivo PNG o JPG.");
  }

  let archivo: File;
  let convertido = false;
  if (TIPOS_DIRECTOS.includes(blob.type)) {
    const ext = blob.type === "image/png" ? "png" : "jpg";
    archivo = blob instanceof File ? blob : new File([blob], `logo.${ext}`, { type: blob.type });
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!png) throw new Error("No se pudo convertir la imagen a PNG.");
    archivo = new File([png], "logo-pegado.png", { type: "image/png" });
    convertido = true;
  }
  const { width: ancho, height: alto } = bitmap;
  bitmap.close();

  if (archivo.size > LOGO_MAX_BYTES) {
    throw new Error(`El logo pesa ${formatearTamano(archivo.size)}; el máximo es 5 MB.`);
  }
  const tipo = archivo.type === "image/png" ? "PNG" : "JPG";
  return {
    archivo,
    url: URL.createObjectURL(archivo),
    descripcion: `${tipo} · ${formatearTamano(archivo.size)} · ${ancho}×${alto} px`,
    convertido,
  };
}

/** Imagen como archivo dentro del portapapeles o de lo que se arrastró. */
function imagenDe(dt: DataTransfer): File | null {
  for (const f of Array.from(dt.files)) if (f.type.startsWith("image/")) return f;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

/** URL de imagen dentro de HTML pegado/arrastrado (p. ej. desde Outlook o un navegador). */
function urlImagenDe(dt: DataTransfer): string | null {
  const html = dt.getData("text/html");
  if (html) {
    const img = new DOMParser().parseFromString(html, "text/html").querySelector("img[src]");
    const src = img?.getAttribute("src");
    if (src && /^(data:image\/|https?:)/i.test(src)) return src;
  }
  const uri = dt.getData("text/uri-list").split("\n").find((l) => l && !l.startsWith("#"));
  return uri && /^(data:image\/|https?:)/i.test(uri.trim()) ? uri.trim() : null;
}

export function ZonaLogo({
  id,
  valor,
  onCambio,
  error,
  descritoPor,
  zonaRef,
}: {
  id: string;
  valor: LogoSeleccionado | null;
  onCambio: (v: LogoSeleccionado | null) => void;
  error?: string;
  descritoPor?: string;
  zonaRef?: Ref<HTMLDivElement>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [esMac, setEsMac] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- solo se conoce en el navegador
    setEsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  async function procesar(fuente: Blob | string) {
    setProcesando(true);
    setAviso(null);
    try {
      let blob: Blob;
      if (typeof fuente === "string") {
        const r = await fetch(fuente).catch(() => null);
        if (!r?.ok) {
          throw new Error("No se pudo leer la imagen pegada. Guárdala como archivo y arrástrala aquí.");
        }
        blob = await r.blob();
      } else {
        blob = fuente;
      }
      const listo = await prepararImagen(blob);
      onCambio(listo);
      if (listo.convertido) setAviso("La imagen se convirtió a PNG automáticamente.");
    } catch (e) {
      // Si ya había un logo válido, se conserva.
      setAviso(e instanceof Error ? e.message : "No se pudo usar esa imagen.");
    } finally {
      setProcesando(false);
    }
  }

  // Pegar con ⌘V / Ctrl+V en cualquier parte de la página.
  const alPegar = useEffectEvent((e: ClipboardEvent) => {
    const dt = e.clipboardData;
    if (!dt) return;
    const destino = e.target as HTMLElement | null;
    const enCampoTexto =
      !!destino?.closest("input, textarea, [contenteditable='true']") &&
      !contenedorRef.current?.contains(destino);
    // Si se pega texto dentro de un campo, se respeta el pegado normal
    // (Word/Outlook también ponen una imagen del texto copiado en el portapapeles).
    if (enCampoTexto && dt.getData("text/plain").trim()) return;

    const archivo = imagenDe(dt);
    if (archivo) {
      e.preventDefault();
      void procesar(archivo);
      return;
    }
    if (!enCampoTexto) {
      const url = urlImagenDe(dt);
      if (url) {
        e.preventDefault();
        void procesar(url);
      }
    }
  });

  useEffect(() => {
    const h = (e: ClipboardEvent) => alPegar(e);
    document.addEventListener("paste", h);
    return () => document.removeEventListener("paste", h);
  }, []);

  function abrirSelector() {
    inputRef.current?.click();
  }

  const mensaje = error ?? aviso;
  const esError = Boolean(error) || (aviso !== null && !aviso.startsWith("La imagen se convirtió"));

  return (
    <div ref={contenedorRef} className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="input-logo"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void procesar(f);
          e.target.value = "";
        }}
      />

      <div
        id={id}
        ref={zonaRef}
        role="button"
        tabIndex={0}
        aria-label="Logo: pega una imagen, arrástrala aquí o presiona Enter para elegir un archivo"
        aria-describedby={descritoPor}
        onClick={() => !valor && abrirSelector()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            abrirSelector();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const archivo = imagenDe(e.dataTransfer);
          const url = archivo ? null : urlImagenDe(e.dataTransfer);
          if (archivo) void procesar(archivo);
          else if (url) void procesar(url);
          else setAviso("Eso no parece una imagen. Usa un archivo PNG o JPG.");
        }}
        className={cn(
          "relative flex min-h-48 items-center justify-center rounded-xl border-2 border-dashed bg-lienzo-logo p-4 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          !valor && "cursor-pointer hover:border-primary/50 hover:bg-accent/40",
          arrastrando && "border-primary bg-accent/60",
          error && "border-destructive/60",
        )}
      >
        {procesando ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Procesando imagen…
          </div>
        ) : valor ? (
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-center">
            <div className="flex h-36 w-full items-center justify-center rounded-lg bg-card p-2 sm:w-48">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL local */}
              <img src={valor.url} alt="Vista previa del logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <p className="text-sm text-muted-foreground" data-testid="info-logo">
                {valor.descripcion}
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button type="button" variant="outline" size="sm" onClick={abrirSelector}>
                  <RefreshCwIcon data-icon="inline-start" />
                  Reemplazar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAviso(null);
                    onCambio(null);
                  }}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Quitar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">También puedes pegar o arrastrar otra imagen para reemplazarla.</p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-3 text-primary">
              <ClipboardPasteIcon className="size-6" strokeWidth={1.5} />
              <ImageUpIcon className="size-6" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium">
              Pega el logo con <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono text-xs">{esMac ? "⌘V" : "Ctrl+V"}</kbd>, arrástralo aquí o haz clic para elegirlo
            </p>
            <p className="text-xs text-muted-foreground">PNG o JPG · máximo 5 MB</p>
          </div>
        )}
      </div>

      {mensaje && (
        <p className={cn("text-sm", esError ? "text-destructive" : "text-muted-foreground")} role={esError ? "alert" : "status"}>
          {mensaje}
        </p>
      )}
    </div>
  );
}
