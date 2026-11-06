import { cn } from "@/lib/utils";

/** Encabezado de página consistente: antetítulo, título (Fraunces), descripción y acciones. */
export function EncabezadoPagina({
  antetitulo,
  titulo,
  descripcion,
  acciones,
  className,
}: {
  antetitulo?: React.ReactNode;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 space-y-2">
        {antetitulo && <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{antetitulo}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{titulo}</h1>
        {descripcion && <div className="max-w-2xl text-sm text-muted-foreground sm:text-base">{descripcion}</div>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

/** Tarjeta de métrica: etiqueta, cifra grande (tabular) y pie opcional. */
export function Metrica({
  etiqueta,
  cifra,
  pie,
  icono,
  tono = "normal",
  testid,
  className,
  children,
}: {
  etiqueta: string;
  cifra: React.ReactNode;
  pie?: React.ReactNode;
  icono?: React.ReactNode;
  tono?: "normal" | "primario" | "oro";
  testid?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{etiqueta}</p>
        {icono && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
              tono === "oro" ? "bg-oro-suave text-oro-foreground" : "bg-accent text-accent-foreground",
            )}
          >
            {icono}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 font-heading text-4xl leading-none font-semibold cifras",
          tono === "primario" && "text-primary",
          tono === "oro" && "text-oro-foreground",
        )}
        data-testid={testid}
      >
        {cifra}
      </p>
      {pie && <div className="mt-2 text-sm text-muted-foreground">{pie}</div>}
      {children}
    </div>
  );
}
