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

/** Lista de votantes ordenada alfabéticamente (sin datos sensibles). */
export async function obtenerVotantes(): Promise<Pick<Votante, "id" | "nombre">[]> {
  return VOTANTES.map(({ id, nombre }) => ({ id, nombre })).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es-MX"),
  );
}

/** Busca un votante por id; devuelve `null` si no existe. */
export async function obtenerVotante(id: string): Promise<Pick<Votante, "id" | "nombre"> | null> {
  const v = VOTANTES.find((x) => x.id === id);
  return v ? { id: v.id, nombre: v.nombre } : null;
}

/** Total de votantes (útil para mostrar avance de votación: "8 de 11"). */
export async function totalVotantes(): Promise<number> {
  return VOTANTES.length;
}
