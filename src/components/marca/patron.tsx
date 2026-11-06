import { cn } from "@/lib/utils";

/**
 * Patrón geométrico sutil (círculos, cuadrados redondeados y trazos) para fondos tinta.
 * Usa currentColor: el color se controla con clases de texto (tokens).
 */
export function PatronGeometrico({ className }: { className?: string }) {
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden>
      <defs>
        <pattern id="patron-identidad" width="120" height="120" patternUnits="userSpaceOnUse">
          <rect x="14" y="14" width="34" height="34" rx="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="90" cy="31" r="7" fill="currentColor" opacity="0.55" />
          <path d="M74 86h18v20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="31" cy="92" r="15" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </pattern>
        <radialGradient id="patron-desvanecer" cx="30%" cy="30%" r="85%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="patron-mascara">
          <rect width="100%" height="100%" fill="url(#patron-desvanecer)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#patron-identidad)" mask="url(#patron-mascara)" />
    </svg>
  );
}
