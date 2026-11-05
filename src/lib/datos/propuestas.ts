import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "./auth";
import { borrarLogo, subirLogo } from "./logos";
import { falla, limpiarTexto, ok, type EstadoPropuesta, type Propuesta, type Resultado } from "./tipos";

/** Todas las funciones de este archivo son solo para admins (sesión + RLS). */

export type DatosPropuesta = {
  participante_nombre: string;
  area: string;
  ciudad: string;
  nombre_propuesto: string;
  significado: string;
  notas_internas?: string | null;
};

function normalizarDatos(d: DatosPropuesta): Resultado<DatosPropuesta> {
  const limpio = {
    participante_nombre: limpiarTexto(d.participante_nombre ?? ""),
    area: limpiarTexto(d.area ?? ""),
    ciudad: limpiarTexto(d.ciudad ?? ""),
    nombre_propuesto: limpiarTexto(d.nombre_propuesto ?? ""),
    significado: (d.significado ?? "").trim(),
    notas_internas: d.notas_internas?.trim() || null,
  };
  const faltantes = (
    [
      ["participante_nombre", "nombre de la persona"],
      ["area", "área"],
      ["ciudad", "ciudad"],
      ["nombre_propuesto", "nombre propuesto"],
      ["significado", "significado"],
    ] as const
  )
    .filter(([k]) => !limpio[k])
    .map(([, etiqueta]) => etiqueta);
  if (faltantes.length) return falla(`Faltan campos obligatorios: ${faltantes.join(", ")}.`);
  return ok(limpio);
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

export async function obtenerPropuesta(id: string): Promise<Propuesta | null> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("propuestas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar la propuesta: ${error.message}`);
  return data;
}

/** Alta: sube el logo (nombre uuid) y crea la propuesta. Si el alta falla, borra el logo. */
export async function crearPropuesta(datos: DatosPropuesta, logo: Blob): Promise<Resultado<Propuesta>> {
  await requerirAdmin();
  const v = normalizarDatos(datos);
  if (!v.ok) return v;

  const subida = await subirLogo(logo);
  if (!subida.ok) return subida;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .insert({ ...v.data, logo_path: subida.data })
    .select("*")
    .single();
  if (error) {
    await borrarLogo(subida.data);
    return falla(`No se pudo guardar la propuesta: ${error.message}`);
  }
  return ok(data);
}

/** Edición: si viene un logo nuevo, lo sube, actualiza la ruta y borra el anterior. */
export async function actualizarPropuesta(
  id: string,
  datos: DatosPropuesta,
  logoNuevo?: Blob | null,
): Promise<Resultado<Propuesta>> {
  await requerirAdmin();
  const v = normalizarDatos(datos);
  if (!v.ok) return v;

  const anterior = await obtenerPropuesta(id);
  if (!anterior) return falla("La propuesta no existe.");

  let logo_path = anterior.logo_path;
  if (logoNuevo && logoNuevo.size > 0) {
    const subida = await subirLogo(logoNuevo);
    if (!subida.ok) return subida;
    logo_path = subida.data;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ ...v.data, logo_path })
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

/** Descartar o reactivar (las propuestas no se borran). */
export async function cambiarEstadoPropuesta(
  id: string,
  estado: EstadoPropuesta,
): Promise<Resultado<Propuesta>> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ estado })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return falla(`No se pudo cambiar el estado: ${error.message}`);
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

/** Valores ya capturados de área y ciudad, para autocompletar (sin repetir, orden alfabético). */
export async function valoresAutocompletar(): Promise<{ areas: string[]; ciudades: string[] }> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("propuestas").select("area, ciudad");
  if (error) throw new Error(`No se pudieron cargar las sugerencias: ${error.message}`);
  const unicos = (xs: string[]) => {
    const vistos = new Map<string, string>();
    for (const x of xs) {
      const k = x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      if (!vistos.has(k)) vistos.set(k, x);
    }
    return [...vistos.values()].sort((a, b) => a.localeCompare(b, "es-MX"));
  };
  return { areas: unicos(data.map((d) => d.area)), ciudades: unicos(data.map((d) => d.ciudad)) };
}
