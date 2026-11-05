import "server-only";
import { obtenerVotantes } from "@/config/votantes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "./auth";

export type PromedioCriterio = {
  criterio_id: string;
  criterio: string;
  orden: number;
  promedio: number;
  calificaciones: number;
};

export type ResultadoPropuesta = {
  ronda_id: string;
  ronda_numero: number;
  propuesta_id: string;
  folio: number;
  nombre_propuesto: string;
  participante_nombre: string;
  propuesta_estado: string;
  promedio_general: number | null;
  promedio_por_criterio: PromedioCriterio[];
  gerentes_calificaron: number;
  posicion: number;
  posicion_final: number | null;
};

/** Ranking de una ronda (vista resultados_ronda), ordenado por posición. Solo admins. */
export async function resultadosRonda(rondaId: string): Promise<ResultadoPropuesta[]> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resultados_ronda")
    .select("*")
    .eq("ronda_id", rondaId)
    .order("posicion", { ascending: true })
    .order("folio", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar los resultados: ${error.message}`);
  return data as unknown as ResultadoPropuesta[];
}

/** Avance de votación por gerente en una ronda: cuántas propuestas calificó cada uno. Solo admins. */
export async function avanceVotacion(
  rondaId: string,
): Promise<{ id: string; nombre: string; propuestasCalificadas: number }[]> {
  await requerirAdmin();
  const { data, error } = await createAdminClient()
    .from("calificaciones")
    .select("votante_id, propuesta_id")
    .eq("ronda_id", rondaId);
  if (error) throw new Error(`No se pudo cargar el avance: ${error.message}`);
  const porVotante = new Map<string, Set<string>>();
  for (const c of data) {
    if (!porVotante.has(c.votante_id)) porVotante.set(c.votante_id, new Set());
    porVotante.get(c.votante_id)!.add(c.propuesta_id);
  }
  return (await obtenerVotantes()).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    propuestasCalificadas: porVotante.get(v.id)?.size ?? 0,
  }));
}
