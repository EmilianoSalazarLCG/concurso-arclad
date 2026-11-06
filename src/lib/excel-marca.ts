import type { Worksheet } from "exceljs";

/**
 * Colores de marca para los Excel exportados. Excel no entiende variables CSS, así que
 * se replican aquí (ÚNICO lugar fuera de globals.css): esmeralda, tinta y marfil.
 */
export const EXCEL = {
  esmeralda: "FF0E7C66",
  tinta: "FF0F1B2D",
  marfil: "FFF7F5F0",
  oro: "FFC8A24A",
} as const;

/** Encabezado con la marca: texto marfil sobre esmeralda, negritas y autofiltro. */
export function estilizarEncabezado(hoja: Worksheet, fondo: string = EXCEL.esmeralda) {
  const h = hoja.getRow(1);
  h.font = { bold: true, color: { argb: EXCEL.marfil } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fondo } };
  h.height = 22;
  h.alignment = { vertical: "middle" };
  hoja.autoFilter = { from: "A1", to: { row: 1, column: hoja.columns.length } };
}
