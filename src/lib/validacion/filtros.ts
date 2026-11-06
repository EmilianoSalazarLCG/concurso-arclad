/**
 * Filtros de la lista de propuestas, leídos de/escritos a la URL.
 * Compartido por servidor (consulta) y navegador (barra de filtros).
 */

export const ORDENES = {
  "folio-asc": "Folio ↑",
  "folio-desc": "Folio ↓",
  "fecha-desc": "Más recientes",
  "fecha-asc": "Más antiguas",
  "nombre-asc": "Nombre propuesto A–Z",
  "nombre-desc": "Nombre propuesto Z–A",
} as const;
export type Orden = keyof typeof ORDENES;

export const ESTADOS_FILTRO = { activas: "Activas", descartadas: "Descartadas", todas: "Todas" } as const;
export type FiltroEstado = keyof typeof ESTADOS_FILTRO;

export type FiltrosPropuestas = {
  q: string;
  area: string;
  ciudad: string;
  estado: FiltroEstado;
  orden: Orden;
  pagina: number;
};

export const POR_PAGINA = 24;
export const FILTROS_POR_DEFECTO: FiltrosPropuestas = {
  q: "",
  area: "",
  ciudad: "",
  estado: "activas",
  orden: "folio-asc",
  pagina: 1,
};

type Entrada = URLSearchParams | Record<string, string | string[] | undefined>;

function valor(e: Entrada, k: string): string {
  const v = e instanceof URLSearchParams ? e.get(k) : e[k];
  return (Array.isArray(v) ? v[0] : v ?? "").toString();
}

export function leerFiltros(e: Entrada): FiltrosPropuestas {
  const estado = valor(e, "estado");
  const orden = valor(e, "orden");
  const pagina = Number.parseInt(valor(e, "pagina"), 10);
  return {
    q: valor(e, "q").slice(0, 100),
    area: valor(e, "area").slice(0, 100),
    ciudad: valor(e, "ciudad").slice(0, 100),
    estado: estado in ESTADOS_FILTRO ? (estado as FiltroEstado) : FILTROS_POR_DEFECTO.estado,
    orden: orden in ORDENES ? (orden as Orden) : FILTROS_POR_DEFECTO.orden,
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Query string sin los valores por defecto (URLs cortas y limpias). */
export function filtrosAQuery(f: FiltrosPropuestas, cambios: Partial<FiltrosPropuestas> = {}): string {
  const final = { ...f, ...cambios };
  const p = new URLSearchParams();
  for (const k of ["q", "area", "ciudad", "estado", "orden", "pagina"] as const) {
    const v = String(final[k]).trim();
    if (v && v !== String(FILTROS_POR_DEFECTO[k])) p.set(k, v);
  }
  return p.toString();
}

/** Nombre de archivo seguro: "001 - NombrePropuesto.png". */
export function nombreArchivoLogo(folio: number, nombrePropuesto: string, ruta: string): string {
  const ext = ruta.endsWith(".jpg") ? "jpg" : "png";
  const limpio = nombrePropuesto
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${String(folio).padStart(3, "0")} - ${limpio || "propuesta"}.${ext}`;
}
