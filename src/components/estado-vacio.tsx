import { cn } from "@/lib/utils";

/** Ilustración simple y propia (tarjetas apiladas + símbolo), con tokens. */
function Ilustracion() {
  return (
    <svg viewBox="0 0 160 120" className="h-24 w-32" aria-hidden>
      <rect x="34" y="22" width="92" height="74" rx="14" className="fill-muted stroke-border" strokeWidth="1.5" transform="rotate(-7 80 59)" />
      <rect x="34" y="22" width="92" height="74" rx="14" className="fill-card stroke-border" strokeWidth="1.5" transform="rotate(4 80 59)" />
      <rect x="50" y="38" width="38" height="28" rx="8" className="fill-accent" />
      <path d="M62 49h6v12" fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="75" cy="45" r="3" className="fill-oro" />
      <rect x="50" y="74" width="58" height="5" rx="2.5" className="fill-muted" />
      <rect x="50" y="83" width="38" height="5" rx="2.5" className="fill-muted" />
      <circle cx="128" cy="24" r="6" className="fill-oro-suave stroke-oro" strokeWidth="1.5" />
      <circle cx="26" cy="96" r="4" className="fill-accent stroke-primary" strokeWidth="1.5" />
    </svg>
  );
}

/** Estado vacío con ilustración, título y texto amable (+ acción opcional). */
export function EstadoVacio({
  titulo,
  children,
  accion,
  className,
  testid,
}: {
  titulo: string;
  children?: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
  testid?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center", className)}
      data-testid={testid}
    >
      <Ilustracion />
      <p className="mt-4 font-heading text-xl font-semibold text-foreground">{titulo}</p>
      {children && <div className="mt-1.5 max-w-md text-sm text-muted-foreground">{children}</div>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
