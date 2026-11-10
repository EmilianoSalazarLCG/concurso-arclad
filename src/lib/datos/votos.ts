import "server-only";
import { obtenerTodosLosVotantes, obtenerVotante, puedeCalificarPropuesta } from "@/config/votantes";
import { createAdminClient } from "@/lib/supabase/admin";
import { falla, ok, type Resultado } from "./tipos";

/**
 * Registro de votos de gerentes. Se ejecuta SOLO en el servidor con service role
 * (los gerentes no tienen sesión). La futura pantalla de votación lo llamará desde
 * una Server Action o Route Handler. Para agregar PIN: validarlo aquí, antes de escribir.
 */

export type PuntajeCriterio = { criterioId: string; puntaje: number };

export type VotoEntrada = {
  votanteId: string;
  rondaId: string;
  propuestaId: string;
  puntajes: PuntajeCriterio[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida y guarda (upsert) las calificaciones de un gerente para una propuesta.
 * Si el gerente vuelve a votar, su calificación anterior se reemplaza.
 */
export async function registrarCalificaciones(entrada: VotoEntrada): Promise<Resultado<number>> {
  const { votanteId, rondaId, propuestaId, puntajes } = entrada;

  // 1) El votante se valida en el paso 3, contra la lista de votantes de esa ronda.

  // 2) Forma de los datos y puntajes 1–5.
  if (!UUID.test(rondaId) || !UUID.test(propuestaId)) return falla("Datos de votación no válidos.");
  if (!Array.isArray(puntajes) || puntajes.length === 0) return falla("No hay calificaciones que guardar.");
  const criterioIds = new Set<string>();
  for (const p of puntajes) {
    if (!UUID.test(p.criterioId)) return falla("Criterio no válido.");
    if (!Number.isInteger(p.puntaje) || p.puntaje < 1 || p.puntaje > 5) {
      return falla("Cada puntaje debe ser un número entero del 1 al 5.");
    }
    if (criterioIds.has(p.criterioId)) return falla("Hay un criterio repetido.");
    criterioIds.add(p.criterioId);
  }

  const db = createAdminClient();

  // 3) La ronda está abierta.
  const { data: ronda, error: eRonda } = await db.from("rondas").select("estado, numero").eq("id", rondaId).maybeSingle();
  if (eRonda) return falla("No se pudo validar la ronda.");
  if (!ronda) return falla("La ronda no existe.");
  if (ronda.estado !== "abierta") return falla("La ronda no está abierta para votar.");
  const votante = await obtenerVotante(String(votanteId ?? ""), ronda.numero);
  if (!votante) return falla("Votante no válido.");

  // 4) La propuesta pertenece a la ronda y está activa.
  const { data: rp, error: eRp } = await db
    .from("ronda_propuestas")
    .select("propuestas!inner(estado, area)")
    .eq("ronda_id", rondaId)
    .eq("propuesta_id", propuestaId)
    .maybeSingle();
  if (eRp) return falla("No se pudo validar la propuesta.");
  if (!rp) return falla("La propuesta no participa en esta ronda.");
  if (rp.propuestas.estado !== "activa") return falla("La propuesta fue descartada.");

  // 5) Regla opcional de área propia (hoy desactivada).
  if (!puedeCalificarPropuesta(votante, rp.propuestas.area)) {
    return falla("No puedes calificar propuestas de tu propia área.");
  }

  // 6) Los criterios existen y están activos.
  const { data: criterios, error: eCrit } = await db
    .from("criterios")
    .select("id")
    .eq("activo", true)
    .in("id", [...criterioIds]);
  if (eCrit) return falla("No se pudieron validar los criterios.");
  if (criterios.length !== criterioIds.size) return falla("Algún criterio no es válido o no está activo.");

  // 7) Upsert atómico (una sola sentencia).
  const { data, error } = await db
    .from("calificaciones")
    .upsert(
      puntajes.map((p) => ({
        ronda_id: rondaId,
        propuesta_id: propuestaId,
        votante_id: votante.id,
        criterio_id: p.criterioId,
        puntaje: p.puntaje,
      })),
      { onConflict: "ronda_id,propuesta_id,votante_id,criterio_id" },
    )
    .select("id");
  if (error) return falla(`No se pudo guardar el voto: ${error.message}`);
  return ok(data.length);
}

/** Calificaciones previas de un gerente en una ronda: { propuestaId: { criterioId: puntaje } }. */
export async function calificacionesDeVotante(
  votanteId: string,
  rondaId: string,
): Promise<Record<string, Record<string, number>>> {
  if (!(await obtenerTodosLosVotantes()).some((v) => v.id === votanteId)) return {};
  const { data, error } = await createAdminClient()
    .from("calificaciones")
    .select("propuesta_id, criterio_id, puntaje")
    .eq("ronda_id", rondaId)
    .eq("votante_id", votanteId);
  if (error) throw new Error(`No se pudieron cargar tus calificaciones: ${error.message}`);
  const mapa: Record<string, Record<string, number>> = {};
  for (const c of data) (mapa[c.propuesta_id] ??= {})[c.criterio_id] = c.puntaje;
  return mapa;
}
