import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  canonizar,
  claveNormalizada,
  limpiarCampos,
  validarCampos,
  type CamposPropuesta,
} from "@/lib/validacion/propuesta";
import { requerirAdmin } from "./auth";
import { borrarLogo, verificarLogoSubido } from "./logos";
import { falla, ok, type EstadoPropuesta, type Propuesta, type Resultado } from "./tipos";

/** Todas las funciones de este archivo son solo para admins (sesión + RLS). */

export type DatosPropuesta = Partial<CamposPropuesta>;

/** Valida en servidor y unifica área/ciudad con las variantes ya capturadas. */
async function prepararDatos(d: DatosPropuesta): Promise<Resultado<CamposPropuesta>> {
  const limpio = limpiarCampos(d);
  const primero = Object.values(validarCampos(limpio))[0];
  if (primero) return falla(primero);

  const { areas, ciudades } = await valoresAutocompletar();
  return ok({ ...limpio, area: canonizar(limpio.area, areas), ciudad: canonizar(limpio.ciudad, ciudades) });
}

function filaDesde(c: CamposPropuesta) {
  return { ...c, notas_internas: c.notas_internas || null };
}

export async function listarPropuestas(filtro?: { estado?: EstadoPropuesta }): Promise<Propuesta[]> {
  await requerirAdmin();
  const supabase = await createClient();
  let q = supabase.from("propuestas").select("*").order("folio", { ascending: true });
  if (filtro?.estado) q = q.eq("estado", filtro.estado);
  const { data, error } = await q;
  if (error) throw new Error(`No se pudieron cargar las propuestas: ${error.message}`);
  return data;
}

export async function contarPropuestas(): Promise<{ activas: number; descartadas: number }> {
  await requerirAdmin();
  const supabase = await createClient();
  const contar = async (estado: EstadoPropuesta) => {
    const { count, error } = await supabase
      .from("propuestas")
      .select("id", { count: "exact", head: true })
      .eq("estado", estado);
    if (error) throw new Error(`No se pudieron contar las propuestas: ${error.message}`);
    return count ?? 0;
  };
  const [activas, descartadas] = await Promise.all([contar("activa"), contar("descartada")]);
  return { activas, descartadas };
}

export async function obtenerPropuesta(id: string): Promise<Propuesta | null> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("propuestas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar la propuesta: ${error.message}`);
  return data;
}

/**
 * Alta. `logoRuta` es el archivo que el navegador ya subió con la URL firmada
 * (ver logos.ts). Se valida el archivo; si algo falla, el logo se borra.
 */
export async function crearPropuesta(datos: DatosPropuesta, logoRuta: string): Promise<Resultado<Propuesta>> {
  await requerirAdmin();
  const v = await prepararDatos(datos);
  if (!v.ok) {
    await borrarLogo(logoRuta);
    return v;
  }
  const logo = await verificarLogoSubido(logoRuta);
  if (!logo.ok) return logo;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .insert({ ...filaDesde(v.data), logo_path: logo.data })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return falla("Ese logo ya está asignado a otra propuesta. Vuelve a subirlo.");
    await borrarLogo(logo.data);
    return falla(`No se pudo guardar la propuesta: ${error.message}`);
  }
  return ok(data);
}

/** Edición: si viene `logoRutaNueva` (ya subido), reemplaza el logo y borra el anterior. */
export async function actualizarPropuesta(
  id: string,
  datos: DatosPropuesta,
  logoRutaNueva?: string | null,
): Promise<Resultado<Propuesta>> {
  await requerirAdmin();
  const v = await prepararDatos(datos);
  if (!v.ok) {
    if (logoRutaNueva) await borrarLogo(logoRutaNueva);
    return v;
  }

  const anterior = await obtenerPropuesta(id);
  if (!anterior) {
    if (logoRutaNueva) await borrarLogo(logoRutaNueva);
    return falla("La propuesta no existe.");
  }

  let logo_path = anterior.logo_path;
  if (logoRutaNueva) {
    const logo = await verificarLogoSubido(logoRutaNueva);
    if (!logo.ok) return logo;
    logo_path = logo.data;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ ...filaDesde(v.data), logo_path })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (logo_path !== anterior.logo_path) await borrarLogo(logo_path);
    return falla(`No se pudo actualizar la propuesta: ${error.message}`);
  }
  if (logo_path !== anterior.logo_path) await borrarLogo(anterior.logo_path);
  return ok(data);
}

export const MOTIVO_DESCARTE_MAX = 500;

/**
 * Descarta una propuesta (no se borra). La base de datos rechaza el descarte si la
 * propuesta está en una ronda abierta o cerrada, y registra quién y cuándo.
 */
export async function descartarPropuesta(id: string, motivo?: string | null): Promise<Resultado<Propuesta>> {
  await requerirAdmin();
  const m = (motivo ?? "").trim();
  if (m.length > MOTIVO_DESCARTE_MAX) return falla(`El motivo admite máximo ${MOTIVO_DESCARTE_MAX} caracteres.`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ estado: "descartada", motivo_descarte: m || null })
    .eq("id", id)
    .eq("estado", "activa")
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23514" && error.message.startsWith("No se puede descartar")) return falla(error.message);
    return falla(`No se pudo descartar: ${error.message}`);
  }
  if (!data) return falla("La propuesta no existe o ya estaba descartada.");
  return ok(data);
}

/** Regresa una propuesta descartada a activa (borra el motivo de descarte). */
export async function restaurarPropuesta(id: string): Promise<Resultado<Propuesta>> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ estado: "activa" })
    .eq("id", id)
    .eq("estado", "descartada")
    .select("*")
    .maybeSingle();
  if (error) return falla(`No se pudo restaurar: ${error.message}`);
  if (!data) return falla("La propuesta no existe o ya estaba activa.");
  return ok(data);
}

export type PosibleDuplicado = {
  id: string;
  folio: number;
  participante_nombre: string;
  nombre_propuesto: string;
  estado: string;
  motivo: "nombre_similar" | "mismo_participante";
  similitud: number;
};

/** Aviso de duplicados para el formulario (ignora mayúsculas y acentos). */
export async function buscarPosiblesDuplicados(
  participante: string,
  nombrePropuesto: string,
  excluirId?: string,
): Promise<PosibleDuplicado[]> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buscar_posibles_duplicados", {
    p_participante: participante,
    p_nombre_propuesto: nombrePropuesto,
    ...(excluirId ? { p_excluir_id: excluirId } : {}),
  });
  if (error) throw new Error(`No se pudo buscar duplicados: ${error.message}`);
  return data as PosibleDuplicado[];
}

/** Valores ya capturados de área y ciudad para autocompletar (sin variantes, orden alfabético). */
export async function valoresAutocompletar(): Promise<{ areas: string[]; ciudades: string[] }> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .select("area, ciudad")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar las sugerencias: ${error.message}`);
  // Conserva la primera grafía capturada de cada valor ("Operaciones" gana a "operaciones").
  const unicos = (xs: string[]) => {
    const vistos = new Map<string, string>();
    for (const x of xs) {
      const k = claveNormalizada(x);
      if (!vistos.has(k)) vistos.set(k, x);
    }
    return [...vistos.values()].sort((a, b) => a.localeCompare(b, "es-MX"));
  };
  return { areas: unicos(data.map((d) => d.area)), ciudades: unicos(data.map((d) => d.ciudad)) };
}
