/**
 * Configuración de la página de votación (/votar).
 */

/** La votación es anónima: los gerentes NO ven participante, área ni ciudad. */
export const MOSTRAR_AUTOR_EN_VOTACION = false;

/** Escala de la rúbrica (1–5). */
export const ESCALA = [
  { valor: 1, etiqueta: "No cumple" },
  { valor: 2, etiqueta: "Cumple poco" },
  { valor: 3, etiqueta: "Cumple en parte" },
  { valor: 4, etiqueta: "Cumple" },
  { valor: 5, etiqueta: "Cumple mucho" },
] as const;
