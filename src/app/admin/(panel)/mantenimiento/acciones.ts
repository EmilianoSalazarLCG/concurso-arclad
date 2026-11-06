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
