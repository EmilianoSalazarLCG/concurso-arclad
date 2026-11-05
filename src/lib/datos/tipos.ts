import type { Tables } from "@/types/database";

export type Propuesta = Tables<"propuestas">;
export type Criterio = Tables<"criterios">;
export type Ronda = Tables<"rondas">;
export type Admin = Tables<"admins">;

export type EstadoPropuesta = "activa" | "descartada";
export type EstadoRonda = "pendiente" | "abierta" | "cerrada";

/** Resultado de una operación de escritura, con mensaje listo para la interfaz. */
export type Resultado<T = void> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): Resultado<T> => ({ ok: true, data });
export const falla = (error: string): Resultado<never> => ({ ok: false, error });

/** Folio visible con 3 dígitos: 7 → "007". */
export function formatearFolio(folio: number): string {
  return String(folio).padStart(3, "0");
}

/** Recorta y colapsa espacios (para área, ciudad, nombres). */
export function limpiarTexto(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}
