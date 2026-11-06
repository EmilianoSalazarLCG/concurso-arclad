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
    <article className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div
        className={cn(
          "relative flex aspect-[4/3] items-center justify-center border-b bg-lienzo-logo p-6",
          descartada && "[&_img]:opacity-50 [&_img]:grayscale",
        )}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs firmadas/locales, sin optimizador
          <img
            src={logoUrl}
            alt={`Logo de ${nombrePropuesto || "la propuesta"}`}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/70">
            <ImageIcon className="size-10" strokeWidth={1.25} />
            <span className="text-xs">Logo</span>
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-md bg-card/90 px-2 py-0.5 font-mono text-xs text-muted-foreground shadow-xs">
          {folio ? `Folio ${folio}` : vistaPrevia ? "Folio nuevo" : ""}
        </span>
        {descartada && (
          <span className="absolute top-3 right-3 rounded-md bg-destructive px-2 py-0.5 text-xs font-medium text-white shadow-xs">
            Descartada
          </span>
        )}
      </div>
      <div className="space-y-3 p-5">
        <h3
          className={cn(
            "text-2xl leading-tight font-semibold break-words",
            !nombrePropuesto && "text-muted-foreground/60",
          )}
        >
          {nombrePropuesto || "Nombre propuesto"}
        </h3>
        <p
          className={cn(
            "line-clamp-5 text-sm leading-relaxed break-words whitespace-pre-line",
            significado ? "text-foreground/80" : "text-muted-foreground/60",
          )}
        >
          {significado || "Aquí aparecerá el significado: por qué ese nombre y ese logo."}
        </p>
        <div className="border-t pt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{participante || "Nombre de la persona"}</span>
          {meta && <span> · {meta}</span>}
        </div>
      </div>
    </article>
  );
}
