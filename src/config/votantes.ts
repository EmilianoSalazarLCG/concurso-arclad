/**
 * Gerentes que votan en el concurso.
 *
 * Fuente única de verdad para los votantes. El resto de la app NO debe importar
 * `VOTANTES` directamente: usa `obtenerVotantes()` / `obtenerVotante()`.
 * Así, en el futuro se puede:
 *  - mover la lista a una tabla de Supabase (cambiar solo estas funciones a async/DB), o
 *  - agregar un PIN (campo opcional `pinHash` + validación en el servidor),
 * sin rehacer la votación: los votos se guardan por `id` estable, nunca por nombre.
 */

export type Votante = {
  /** Identificador estable (slug). No cambiarlo una vez que existan votos. */
  id: string;
  /** Nombre visible en la interfaz. */
  nombre: string;
  /** Área del gerente (opcional). Solo se usa si se activa EXCLUIR_PROPIA_AREA. */
  area?: string;
  /** Reservado para una futura validación con PIN (hash, solo servidor). */
  pinHash?: string;
};

const VOTANTES: readonly Votante[] = [
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

/**
 * Regla de negocio: ¿un gerente puede calificar propuestas de su propia área?
 * Por ahora SÍ (false = no se excluye nada). Para activarla: poner `true` y
 * llenar `area` en cada gerente con el mismo texto que se captura en las propuestas.
 */
export const EXCLUIR_PROPIA_AREA = false;

type VotanteVisible = Pick<Votante, "id" | "nombre" | "area">;

/** Lista de votantes ordenada alfabéticamente (sin datos sensibles). */
export async function obtenerVotantes(): Promise<VotanteVisible[]> {
  return VOTANTES.map(({ id, nombre, area }) => ({ id, nombre, area })).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es-MX"),
  );
}

/** Busca un votante por id; devuelve `null` si no existe. */
export async function obtenerVotante(id: string): Promise<VotanteVisible | null> {
  const v = VOTANTES.find((x) => x.id === id);
  return v ? { id: v.id, nombre: v.nombre, area: v.area } : null;
}

/** Total de votantes (útil para mostrar avance de votación: "8 de 11"). */
export async function totalVotantes(): Promise<number> {
  return VOTANTES.length;
}

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

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
