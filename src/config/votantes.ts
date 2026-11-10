import { PERSONAL_RONDA_3 } from "./personal-ronda-3";

/**
 * Votantes del concurso.
 *
 * Fuente única de verdad para los votantes. El resto de la app NO debe importar
 * las listas directamente: usa `obtenerVotantes()` / `obtenerVotante()` / `totalVotantes()`.
 * Así, en el futuro se puede:
 * - mover la lista a una tabla de Supabase (cambiar solo estas funciones a async/DB), o
 * - agregar un PIN (campo opcional `pinHash` + validación en el servidor),
 * sin rehacer la votación: los votos se guardan por `id` estable, nunca por nombre.
 *
 * Votantes por ronda: por defecto votan los 11 gerentes (Rondas 1 y 2). Una ronda puede
 * tener su propia lista en `VOTANTES_POR_RONDA` (la Ronda 3 la vota todo el personal del
 * listado + los gerentes). Las funciones reciben el número de ronda; sin número usan la lista
 * por defecto.
 */

export type Votante = {
  /** Identificador estable (slug). No cambiarlo una vez que existan votos. */
  id: string;
  /** Nombre visible en la interfaz. */
  nombre: string;
  /** Área (opcional). Solo se usa si se activa EXCLUIR_PROPIA_AREA. */
  area?: string;
  /** Reservado para una futura validación con PIN (hash, solo servidor). */
  pinHash?: string;
};

const GERENTES: readonly Votante[] = [
  { id: "alexandra-taborda", nombre: "Alexandra Taborda" },
  { id: "carlos-uribe", nombre: "Carlos Uribe" },
  { id: "daniela-tamayo", nombre: "Daniela Tamayo" },
  { id: "jaime-restrepo", nombre: "Jaime Restrepo" },
  { id: "jose-torres", nombre: "José Torres" },
  { id: "julian-morales", nombre: "Julián Morales" },
  { id: "luis-cruz", nombre: "Luis Cruz" },
  { id: "miguel-fresnedo", nombre: "Miguel Fresnedo" },
  { id: "rosa-meardi", nombre: "Rosa Meardi" },
  { id: "saul-mora", nombre: "Saúl Mora" },
  { id: "tomas-hernandez", nombre: "Tomás Hernández" },
];

/** Rondas con una lista propia de votantes (número de ronda → votantes). */
const VOTANTES_POR_RONDA: Readonly<Record<number, readonly Votante[]>> = {
  3: [...GERENTES, ...PERSONAL_RONDA_3],
};

/** Cómo se nombra a los votantes en textos de avance ("8 de 11 gerentes enviaron"). */
const ETIQUETA_POR_RONDA: Readonly<Record<number, string>> = {
  3: "personas",
};

/**
 * Regla de negocio: ¿un votante puede calificar propuestas de su propia área?
 * Por ahora SÍ (false = no se excluye nada). Para activarla: poner `true` y
 * llenar `area` en cada votante con el mismo texto que se captura en las propuestas.
 */
export const EXCLUIR_PROPIA_AREA = false;

type VotanteVisible = Pick<Votante, "id" | "nombre" | "area">;

function listaDeRonda(numeroRonda?: number | null): readonly Votante[] {
  return (numeroRonda != null && VOTANTES_POR_RONDA[numeroRonda]) || GERENTES;
}

const visible = ({ id, nombre, area }: Votante): VotanteVisible => ({ id, nombre, area });

/** Votantes de una ronda (o los gerentes si no se indica), en orden alfabético y sin datos sensibles. */
export async function obtenerVotantes(numeroRonda?: number | null): Promise<VotanteVisible[]> {
  return listaDeRonda(numeroRonda)
    .map(visible)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-MX"));
}

/** Busca un votante por id dentro de la lista de la ronda; devuelve `null` si no existe. */
export async function obtenerVotante(id: string, numeroRonda?: number | null): Promise<VotanteVisible | null> {
  const v = listaDeRonda(numeroRonda).find((x) => x.id === id);
  return v ? visible(v) : null;
}

/** Total de votantes de la ronda (útil para mostrar avance de votación: "8 de 11"). */
export async function totalVotantes(numeroRonda?: number | null): Promise<number> {
  return listaDeRonda(numeroRonda).length;
}

/** Texto para el avance: "gerentes" o "personas" según la ronda. */
export function etiquetaVotantes(numeroRonda?: number | null): string {
  return (numeroRonda != null && ETIQUETA_POR_RONDA[numeroRonda]) || "gerentes";
}

/** Todos los votantes de todas las rondas, sin repetir (para mostrar nombres en detalles). */
export async function obtenerTodosLosVotantes(): Promise<VotanteVisible[]> {
  const porId = new Map<string, Votante>();
  for (const v of [...GERENTES, ...Object.values(VOTANTES_POR_RONDA).flat()]) if (!porId.has(v.id)) porId.set(v.id, v);
  return [...porId.values()].map(visible);
}

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * ¿Este votante puede calificar una propuesta de esta área?
 * Hoy siempre devuelve true (EXCLUIR_PROPIA_AREA = false). Úsala en el servidor
 * al registrar votos y en la pantalla de votación para filtrar propuestas.
 */
export function puedeCalificarPropuesta(
  votante: Pick<Votante, "area">,
  areaPropuesta: string,
): boolean {
  if (!EXCLUIR_PROPIA_AREA || !votante.area) return true;
  return normalizar(votante.area) !== normalizar(areaPropuesta);
}
