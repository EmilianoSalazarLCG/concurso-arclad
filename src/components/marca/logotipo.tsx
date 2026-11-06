import { cn } from "@/lib/utils";

/**
 * Símbolo de Concurso Identidad: una "i" geométrica (trazo + punto dorado) que
 * también se lee como una persona — la identidad que se construye entre todos.
 * Colores 100% por tokens (fill-primary, stroke-tinta-foreground, fill-oro).
 */
export function Simbolo({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M11 13.5h5.5V25" fill="none" className="stroke-primary-foreground" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21.5" cy="9" r="3.2" className="fill-oro" />
    </svg>
  );
}

const TAMANOS = {
  sm: { simbolo: "size-7", texto: "text-lg", gap: "gap-2" },
  md: { simbolo: "size-9", texto: "text-xl", gap: "gap-2.5" },
  lg: { simbolo: "size-12", texto: "text-3xl", gap: "gap-3" },
  xl: { simbolo: "size-16", texto: "text-4xl sm:text-5xl", gap: "gap-4" },
} as const;

/** Wordmark: «Concurso Identidad» en Fraunces, con «Identidad» en itálica esmeralda. */
export function Logotipo({
  tamano = "md",
  className,
  conSimbolo = true,
}: {
  tamano?: keyof typeof TAMANOS;
  className?: string;
  conSimbolo?: boolean;
}) {
  const t = TAMANOS[tamano];
  return (
    <span className={cn("inline-flex items-center", t.gap, className)} data-testid="logotipo">
      {conSimbolo && <Simbolo className={t.simbolo} />}
      <span className={cn("font-heading leading-none font-semibold tracking-[-0.02em] whitespace-nowrap text-foreground", t.texto)}>
        Concurso <em className="font-medium text-primary italic">Identidad</em>
      </span>
    </span>
  );
}
