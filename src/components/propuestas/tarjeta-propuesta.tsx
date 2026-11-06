import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DatosTarjeta = {
  folio?: string | null;
  nombrePropuesto: string;
  significado: string;
  participante: string;
  area: string;
  ciudad: string;
  logoUrl?: string | null;
};

/**
 * Tarjeta de propuesta tal como se ve en la galería.
 * Sin estado: sirve en Server y Client Components (vista previa, galería, modo reunión).
 */
export function TarjetaPropuesta({
  datos,
  className,
  vistaPrevia = false,
  descartada = false,
}: {
  datos: DatosTarjeta;
  className?: string;
  vistaPrevia?: boolean;
  /** Marca visual para propuestas descartadas (solo en vistas de admin). */
  descartada?: boolean;
}) {
  const { folio, nombrePropuesto, significado, participante, area, ciudad, logoUrl } = datos;
  const meta = [area, ciudad].filter(Boolean).join(" · ");

  return (
    <article className={cn("flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div
        className={cn(
          "relative m-2 mb-0 flex aspect-[4/3] items-center justify-center rounded-lg bg-lienzo-logo p-7",
          descartada && "[&_img]:opacity-45 [&_img]:grayscale",
        )}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs firmadas/locales, sin optimizador
          <img
            src={logoUrl}
            alt={`Logo de ${nombrePropuesto || "la propuesta"}`}
            loading="lazy"
            className="max-h-full max-w-full object-contain drop-shadow-[0_1px_1px_rgb(0_0_0/0.04)]"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
            <ImageIcon className="size-10" strokeWidth={1.25} />
            <span className="text-xs font-medium">Logo</span>
          </div>
        )}
        {(folio || vistaPrevia) && (
          <span className="absolute top-2.5 left-2.5 rounded-full border border-border bg-card/95 px-2.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground shadow-xs cifras">
            {folio ? `Folio ${folio}` : "Folio nuevo"}
          </span>
        )}
        {descartada && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-destructive px-2.5 py-0.5 text-[0.7rem] font-semibold text-white shadow-xs">
            Descartada
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h3 className={cn("text-2xl leading-tight font-semibold break-words", !nombrePropuesto && "text-muted-foreground/50")}>
          {nombrePropuesto || "Nombre propuesto"}
        </h3>
        <p
          className={cn(
            "line-clamp-4 text-sm leading-relaxed break-words whitespace-pre-line",
            significado ? "text-foreground/75" : "text-muted-foreground/60",
          )}
        >
          {significado || "Aquí aparecerá el significado: por qué ese nombre y ese logo."}
        </p>
        <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-3 text-xs">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.65rem] font-bold text-secondary-foreground" aria-hidden>
            {(participante || "?")
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">{participante || "Nombre de la persona"}</span>
            {meta && <span className="block truncate text-muted-foreground">{meta}</span>}
          </span>
        </div>
      </div>
    </article>
  );
}
