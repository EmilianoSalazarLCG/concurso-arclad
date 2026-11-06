/**
 * Validación de propuestas compartida por el navegador y el servidor.
 * (Sin dependencias de servidor: se puede importar desde componentes "use client".)
 */

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_TIPOS = ["image/png", "image/jpeg"] as const;
export type TipoLogo = (typeof LOGO_TIPOS)[number];

export const CAMPOS_PROPUESTA = [
  "participante_nombre",
  "area",
  "ciudad",
  "nombre_propuesto",
  "significado",
  "notas_internas",
] as const;
export type CampoPropuesta = (typeof CAMPOS_PROPUESTA)[number];
export type CamposPropuesta = Record<CampoPropuesta, string>;
export type ErroresPropuesta = Partial<Record<CampoPropuesta | "logo", string>>;

export const ETIQUETAS: Record<CampoPropuesta | "logo", string> = {
  participante_nombre: "Nombre de la persona",
  area: "Área",
  ciudad: "Ciudad",
  nombre_propuesto: "Nombre propuesto",
  significado: "Significado",
  notas_internas: "Notas internas",
  logo: "Logo",
};

export const LIMITES: Record<CampoPropuesta, number> = {
  participante_nombre: 120,
  area: 80,
  ciudad: 80,
  nombre_propuesto: 80,
  significado: 3000,
  notas_internas: 2000,
};

const OBLIGATORIOS: CampoPropuesta[] = ["participante_nombre", "area", "ciudad", "nombre_propuesto", "significado"];

export const CAMPOS_VACIOS: CamposPropuesta = {
  participante_nombre: "",
  area: "",
  ciudad: "",
  nombre_propuesto: "",
  significado: "",
  notas_internas: "",
};

/** Recorta y colapsa espacios en campos de una línea; el texto largo solo se recorta. */
export function limpiarCampos(c: Partial<CamposPropuesta>): CamposPropuesta {
  const linea = (t?: string) => (t ?? "").replace(/\s+/g, " ").trim();
  return {
    participante_nombre: linea(c.participante_nombre),
    area: linea(c.area),
    ciudad: linea(c.ciudad),
    nombre_propuesto: linea(c.nombre_propuesto),
    significado: (c.significado ?? "").trim(),
    notas_internas: (c.notas_internas ?? "").trim(),
  };
}

export function validarCampos(c: CamposPropuesta): ErroresPropuesta {
  const errores: ErroresPropuesta = {};
  for (const campo of OBLIGATORIOS) {
    if (!c[campo]) errores[campo] = `${ETIQUETAS[campo]} es obligatorio.`;
  }
  for (const campo of CAMPOS_PROPUESTA) {
    if (!errores[campo] && c[campo].length > LIMITES[campo]) {
      errores[campo] = `${ETIQUETAS[campo]}: máximo ${LIMITES[campo]} caracteres.`;
    }
  }
  return errores;
}

export function validarArchivoLogo(info: { tipo: string; tamano: number } | null): string | undefined {
  if (!info) return "El logo es obligatorio.";
  if (!(LOGO_TIPOS as readonly string[]).includes(info.tipo)) return "El logo debe ser PNG o JPG.";
  if (info.tamano <= 0) return "El logo está vacío.";
  if (info.tamano > LOGO_MAX_BYTES) return "El logo pesa más de 5 MB.";
  return undefined;
}

/** Clave de comparación: sin acentos, minúsculas y espacios colapsados. */
export function claveNormalizada(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Si el valor equivale (sin acentos/mayúsculas) a una opción existente, devuelve la opción. */
export function canonizar(valor: string, opciones: readonly string[]): string {
  const k = claveNormalizada(valor);
  return opciones.find((o) => claveNormalizada(o) === k) ?? valor;
}
