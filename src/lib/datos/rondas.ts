import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "./auth";
import { falla, ok, type Criterio, type Propuesta, type Resultado, type Ronda } from "./tipos";

// ---------------------------------------------------------------- Admin (sesión + RLS)

export async function listarRondas(): Promise<Ronda[]> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("rondas").select("*").order("numero");
  if (error) throw new Error(`No se pudieron cargar las rondas: ${error.message}`);
  return data;
}

/** Abre una ronda. Solo puede haber una abierta a la vez (lo garantiza la base de datos). */
export async function abrirRonda(rondaId: string): Promise<Resultado<Ronda>> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rondas")
    .update({ estado: "abierta" })
    .eq("id", rondaId)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return falla("Ya hay otra ronda abierta. Ciérrala primero.");
    return falla(`No se pudo abrir la ronda: ${error.message}`);
  }
  return ok(data);
}

export async function cerrarRonda(rondaId: string): Promise<Resultado<Ronda>> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rondas")
    .update({ estado: "cerrada" })
    .eq("id", rondaId)
    .select("*")
    .single();
  if (error) return falla(`No se pudo cerrar la ronda: ${error.message}`);
  return ok(data);
}

/** Agrega propuestas a una ronda (ignora las que ya estaban). */
export async function agregarPropuestasARonda(
  rondaId: string,
  propuestaIds: string[],
): Promise<Resultado<number>> {
  await requerirAdmin();
  if (propuestaIds.length === 0) return ok(0);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ronda_propuestas")
    .upsert(
      propuestaIds.map((propuesta_id) => ({ ronda_id: rondaId, propuesta_id })),
      { onConflict: "ronda_id,propuesta_id", ignoreDuplicates: true },
    )
    .select("propuesta_id");
  if (error) return falla(`No se pudieron agregar las propuestas: ${error.message}`);
  return ok(data.length);
}

/** Quita una propuesta de una ronda (borra también sus calificaciones en esa ronda). */
export async function quitarPropuestaDeRonda(rondaId: string, propuestaId: string): Promise<Resultado> {
  await requerirAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("ronda_propuestas")
    .delete()
    .eq("ronda_id", rondaId)
    .eq("propuesta_id", propuestaId);
  if (error) return falla(`No se pudo quitar la propuesta: ${error.message}`);
  return ok(undefined);
}

/** Registra la posición final decidida para una propuesta en una ronda (null para quitarla). */
export async function registrarPosicionFinal(
  rondaId: string,
  propuestaId: string,
  posicion: number | null,
): Promise<Resultado> {
  await requerirAdmin();
  if (posicion !== null && (!Number.isInteger(posicion) || posicion < 1)) {
    return falla("La posición debe ser un entero mayor o igual a 1.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("ronda_propuestas")
    .update({ posicion_final: posicion })
    .eq("ronda_id", rondaId)
    .eq("propuesta_id", propuestaId);
  if (error) return falla(`No se pudo registrar la posición: ${error.message}`);
  return ok(undefined);
}

/** Propuestas de una ronda con todos sus datos (incluye notas internas: solo admins). */
export async function propuestasDeRonda(rondaId: string): Promise<(Propuesta & { posicion_final: number | null })[]> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ronda_propuestas")
    .select("posicion_final, propuestas(*)")
    .eq("ronda_id", rondaId);
  if (error) throw new Error(`No se pudieron cargar las propuestas de la ronda: ${error.message}`);
  return data
    .filter((r) => r.propuestas)
    .map((r) => ({ ...r.propuestas!, posicion_final: r.posicion_final }))
    .sort((a, b) => a.folio - b.folio);
}

// ---------------------------------------------------------------- Votación (service role)
// Los gerentes no tienen sesión de Auth: estas lecturas usan service role y
// NUNCA devuelven notas_internas ni created_by.

export type PropuestaParaVotar = Pick<
  Propuesta,
  "id" | "folio" | "nombre_propuesto" | "significado" | "logo_path" | "area" | "ciudad" | "participante_nombre"
>;

export async function obtenerRondaAbierta(): Promise<Ronda | null> {
  const { data, error } = await createAdminClient()
    .from("rondas")
    .select("*")
    .eq("estado", "abierta")
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar la ronda abierta: ${error.message}`);
  return data;
}

/** Propuestas activas de una ronda, ordenadas por folio, sin datos internos. */
export async function propuestasParaVotar(rondaId: string): Promise<PropuestaParaVotar[]> {
  const { data, error } = await createAdminClient()
    .from("ronda_propuestas")
    .select(
      "propuestas!inner(id, folio, nombre_propuesto, significado, logo_path, area, ciudad, participante_nombre, estado)",
    )
    .eq("ronda_id", rondaId)
    .eq("propuestas.estado", "activa");
  if (error) throw new Error(`No se pudieron cargar las propuestas: ${error.message}`);
  return data
    .map(({ propuestas: p }) => ({
      id: p.id,
      folio: p.folio,
      nombre_propuesto: p.nombre_propuesto,
      significado: p.significado,
      logo_path: p.logo_path,
      area: p.area,
      ciudad: p.ciudad,
      participante_nombre: p.participante_nombre,
    }))
    .sort((a, b) => a.folio - b.folio);
}

export async function criteriosActivos(): Promise<Criterio[]> {
  const { data, error } = await createAdminClient()
    .from("criterios")
    .select("*")
    .eq("activo", true)
    .order("orden");
  if (error) throw new Error(`No se pudieron cargar los criterios: ${error.message}`);
  return data;
}
