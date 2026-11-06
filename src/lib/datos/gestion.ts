import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { claveNormalizada } from "@/lib/validacion/propuesta";
import { POR_PAGINA, nombreArchivoLogo, type FiltrosPropuestas } from "@/lib/validacion/filtros";
import { requerirAdmin } from "./auth";
import type { Propuesta } from "./tipos";

/** Fila de la vista propuestas_admin (solo admins). */
export type PropuestaAdmin = Propuesta & {
  capturada_por_nombre: string | null;
  editada_por_nombre: string | null;
  descartada_por_nombre: string | null;
};

const COLUMNAS =
  "id, folio, participante_nombre, area, ciudad, nombre_propuesto, significado, logo_path, notas_internas, estado, created_by, created_at, updated_at, updated_by, motivo_descarte, descartada_at, descartada_por, capturada_por_nombre, editada_por_nombre, descartada_por_nombre";

/** Escapa comodines de LIKE para buscar el texto tal cual. */
function escaparLike(t: string) {
  return t.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type ClienteServidor = Awaited<ReturnType<typeof createClient>>;

/** Arma la consulta filtrada SIN ejecutarla (no debe ser async: el builder es "thenable"). */
function consultaBase(supabase: ClienteServidor, f: FiltrosPropuestas, opciones: { contar?: boolean } = {}) {
  let q = supabase
    .from("propuestas_admin")
    .select(COLUMNAS, opciones.contar ? { count: "exact" } : undefined);

  if (f.estado === "activas") q = q.eq("estado", "activa");
  if (f.estado === "descartadas") q = q.eq("estado", "descartada");
  if (f.area) q = q.eq("area", f.area);
  if (f.ciudad) q = q.eq("ciudad", f.ciudad);
  const busqueda = claveNormalizada(f.q);
  if (busqueda) q = q.ilike("busqueda", `%${escaparLike(busqueda)}%`);

  const [campo, dir] = f.orden.split("-") as ["folio" | "fecha" | "nombre", "asc" | "desc"];
  const columna = campo === "folio" ? "folio" : campo === "fecha" ? "created_at" : "nombre_orden";
  q = q.order(columna, { ascending: dir === "asc" });
  if (columna !== "folio") q = q.order("folio", { ascending: true });
  return q;
}

export async function listarPropuestasGestion(
  f: FiltrosPropuestas,
): Promise<{ filas: PropuestaAdmin[]; total: number; paginas: number }> {
  await requerirAdmin();
  const desde = (f.pagina - 1) * POR_PAGINA;
  const supabase = await createClient();
  const { data, error, count } = await consultaBase(supabase, f, { contar: true }).range(desde, desde + POR_PAGINA - 1);
  if (error) {
    // Página fuera de rango (p. ej. tras filtrar): PostgREST responde 416.
    if (error.code === "PGRST103") return { filas: [], total: count ?? 0, paginas: 1 };
    throw new Error(`No se pudieron cargar las propuestas: ${error.message}`);
  }
  const total = count ?? 0;
  return { filas: data as unknown as PropuestaAdmin[], total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

/** Todas las propuestas que cumplen los filtros (para exportar). */
export async function todasPropuestasFiltradas(f: FiltrosPropuestas): Promise<PropuestaAdmin[]> {
  await requerirAdmin();
  const supabase = await createClient();
  const filas: PropuestaAdmin[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consultaBase(supabase, f).range(desde, desde + 999);
    if (error) throw new Error(`No se pudieron exportar las propuestas: ${error.message}`);
    filas.push(...(data as unknown as PropuestaAdmin[]));
    if (data.length < 1000) return filas;
  }
}

export type RondaDePropuesta = { numero: number; nombre: string; estado: string; posicion_final: number | null };

export async function obtenerPropuestaGestion(
  id: string,
): Promise<(PropuestaAdmin & { rondas: RondaDePropuesta[] }) | null> {
  await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data, error }, { data: rondas, error: eR }] = await Promise.all([
    supabase.from("propuestas_admin").select(COLUMNAS).eq("id", id).maybeSingle(),
    supabase.from("ronda_propuestas").select("posicion_final, rondas(numero, nombre, estado)").eq("propuesta_id", id),
  ]);
  if (error || eR) throw new Error(`No se pudo cargar la propuesta: ${(error ?? eR)!.message}`);
  if (!data) return null;
  return {
    ...(data as unknown as PropuestaAdmin),
    rondas: (rondas ?? [])
      .filter((r) => r.rondas)
      .map((r) => ({ ...r.rondas!, posicion_final: r.posicion_final }))
      .sort((a, b) => a.numero - b.numero),
  };
}

/** Propuesta anterior y siguiente por folio (todas, sin importar estado). */
export async function vecinosPorFolio(
  folio: number,
): Promise<{ anterior: { id: string; folio: number } | null; siguiente: { id: string; folio: number } | null }> {
  await requerirAdmin();
  const supabase = await createClient();
  const [a, s] = await Promise.all([
    supabase.from("propuestas").select("id, folio").lt("folio", folio).order("folio", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("propuestas").select("id, folio").gt("folio", folio).order("folio", { ascending: true }).limit(1).maybeSingle(),
  ]);
  return { anterior: a.data ?? null, siguiente: s.data ?? null };
}

/** URL firmada que descarga el archivo original como "001 - Nombre.png". */
export async function urlDescargaLogo(p: Pick<Propuesta, "folio" | "nombre_propuesto" | "logo_path">): Promise<string | null> {
  await requerirAdmin();
  const { data } = await createAdminClient()
    .storage.from("logos")
    .createSignedUrl(p.logo_path, 60, { download: nombreArchivoLogo(p.folio, p.nombre_propuesto, p.logo_path) });
  return data?.signedUrl ?? null;
}

/** Enlaces firmados (10 min) para que el navegador arme el ZIP de logos filtrados. */
export async function enlacesLogos(f: FiltrosPropuestas): Promise<{ nombre: string; url: string }[]> {
  const filas = await todasPropuestasFiltradas(f);
  if (filas.length === 0) return [];
  const { data, error } = await createAdminClient()
    .storage.from("logos")
    .createSignedUrls(filas.map((p) => p.logo_path), 600);
  if (error || !data) throw new Error("No se pudieron preparar los logos.");
  const porRuta = new Map(data.filter((d) => d.path && d.signedUrl).map((d) => [d.path!, d.signedUrl]));
  return filas
    .filter((p) => porRuta.has(p.logo_path))
    .map((p) => ({ nombre: nombreArchivoLogo(p.folio, p.nombre_propuesto, p.logo_path), url: porRuta.get(p.logo_path)! }));
}
