"use server";

import { NoAutorizadoError, requerirAdmin } from "@/lib/datos/auth";
import { borrarHuerfanos } from "@/lib/datos/huerfanos";
import { falla, ok, type Resultado } from "@/lib/datos/tipos";
import { createAdminClient } from "@/lib/supabase/admin";

/** Antigüedad mínima para considerar un logo huérfano borrable. */
const HORAS_MINIMAS = 24;

/** Borra los logos huérfanos con más de 24 h (se recalcula al momento de borrar). */
export async function limpiarLogosHuerfanos(): Promise<Resultado<{ borrados: number }>> {
  try {
    await requerirAdmin();
    return ok({ borrados: await borrarHuerfanos(createAdminClient(), HORAS_MINIMAS) });
  } catch (e) {
    if (e instanceof NoAutorizadoError) return falla(e.message);
    console.error(e);
    return falla("No se pudo completar la limpieza. Intenta de nuevo.");
  }
}

/**
 * Activa o desactiva un criterio de votación. No borra calificaciones: un criterio inactivo deja de
 * pedirse en /votar y de contar en envíos y resultados (todo filtra por criterios.activo).
 */
export async function cambiarCriterio(id: string, activo: boolean): Promise<Resultado<null>> {
  try {
    await requerirAdmin();
    if (!/^[0-9a-f-]{36}$/i.test(String(id ?? ""))) return falla("Criterio no válido.");
    const db = createAdminClient();
    if (!activo) {
      const { count, error } = await db
        .from("criterios")
        .select("*", { count: "exact", head: true })
        .eq("activo", true)
        .neq("id", id);
      if (error) throw error;
      if ((count ?? 0) === 0) return falla("Debe quedar al menos un criterio activo.");
    }
    const { data, error } = await db.from("criterios").update({ activo: Boolean(activo) }).eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) return falla("El criterio no existe.");
    return ok(null);
  } catch (e) {
    if (e instanceof NoAutorizadoError) return falla(e.message);
    console.error(e);
    return falla("No se pudo cambiar el criterio. Intenta de nuevo.");
  }
}
