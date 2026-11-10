import "server-only";
import { etiquetaVotantes, obtenerTodosLosVotantes, totalVotantes } from "@/config/votantes";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "./auth";
import { urlsFirmadasLogos } from "./logos";
import { falla, ok, type Resultado } from "./tipos";

/** Resultados (solo admins). Cuentan únicamente los votos ENVIADOS. */

export type PromedioCriterio = { criterio_id: string; criterio: string; orden: number; promedio: number; calificaciones: number };

export type FilaResultado = {
  propuesta_id: string;
  posicion: number;
  posicion_final: number | null;
  folio: number;
  nombre_propuesto: string;
  significado: string;
  participante: string;
  area: string;
  ciudad: string;
  logo_path: string;
  logoUrl: string | null;
  promedio_general: number | null;
  promedio_por_criterio: PromedioCriterio[];
  gerentes: number;
};

export type RondaResultados = {
  ronda: { id: string; numero: number; nombre: string; estado: string; top_n: number };
  totalRondas: number;
  siguiente: { id: string; numero: number; nombre: string; estado: string; top_n: number; propuestas: number; conVotos: boolean } | null;
  /** Propuestas que ya están en la siguiente ronda (tras el avance). */
  avanzadas: string[];
  criterios: { id: string; nombre: string; orden: number }[];
  filas: FilaResultado[];
  enviaron: number;
  totalVotantes: number;
  /** "gerentes" o "personas", según quién vota en la ronda. */
  etiquetaVotantes: string;
  avance: { realizado_at: string; por: string | null; propuestas: number } | null;
  ganadoresConfirmados: { confirmado_at: string; por: string | null } | null;
};

export async function resultadosDeRonda(rondaId: string): Promise<RondaResultados | null> {
  await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(rondaId)) return null;
  const supabase = await createClient();
  const [rondas, filas, criterios, enviados, avance, ganadores, admins] = await Promise.all([
    supabase.from("rondas").select("id, numero, nombre, estado, top_n").order("numero"),
    supabase.from("resultados_ronda").select("*").eq("ronda_id", rondaId),
    supabase.from("criterios").select("id, nombre, orden").eq("activo", true).order("orden"),
    supabase.from("votos_enviados").select("votante_id").eq("ronda_id", rondaId),
    supabase.from("avances_ronda").select("*").eq("ronda_origen_id", rondaId).maybeSingle(),
    supabase.from("ganadores_confirmados").select("*").eq("ronda_id", rondaId).maybeSingle(),
    supabase.from("admins").select("user_id, nombre"),
  ]);
  for (const r of [rondas, filas, criterios, enviados, avance, ganadores, admins]) {
    if (r.error) throw new Error(`No se pudieron cargar los resultados: ${r.error.message}`);
  }
  const ronda = rondas.data!.find((r) => r.id === rondaId);
  if (!ronda) return null;

  const activas = (filas.data ?? []).filter((f) => f.propuesta_estado === "activa");
  const ids = activas.map((f) => f.propuesta_id!);
  const { data: props, error } = ids.length
    ? await supabase.from("propuestas").select("id, significado, area, ciudad, logo_path").in("id", ids)
    : { data: [], error: null };
  if (error) throw new Error("No se pudieron cargar las propuestas.");
  const porId = new Map(props!.map((p) => [p.id, p]));
  const urls = await urlsFirmadasLogos(props!.map((p) => p.logo_path));

  const sig = rondas.data!.find((r) => r.numero === ronda.numero + 1) ?? null;
  let siguiente: RondaResultados["siguiente"] = null;
  let avanzadas: string[] = [];
  if (sig) {
    const [{ data: enSig }, { count: nVotos }] = await Promise.all([
      supabase.from("ronda_propuestas").select("propuesta_id").eq("ronda_id", sig.id),
      supabase.from("calificaciones").select("*", { count: "exact", head: true }).eq("ronda_id", sig.id),
    ]);
    avanzadas = (enSig ?? []).map((x) => x.propuesta_id);
    siguiente = { ...sig, propuestas: avanzadas.length, conVotos: (nVotos ?? 0) > 0 };
  }
  const nombreAdmin = (id: string | null) => admins.data!.find((a) => a.user_id === id)?.nombre ?? null;

  return {
    ronda,
    totalRondas: rondas.data!.length,
    siguiente,
    avanzadas,
    criterios: criterios.data!,
    filas: activas
      .map((f) => {
        const p = porId.get(f.propuesta_id!)!;
        return {
          propuesta_id: f.propuesta_id!,
          posicion: f.posicion!,
          posicion_final: f.posicion_final,
          folio: f.folio!,
          nombre_propuesto: f.nombre_propuesto!,
          significado: p.significado,
          participante: f.participante_nombre!,
          area: p.area,
          ciudad: p.ciudad,
          logo_path: p.logo_path,
          logoUrl: urls[p.logo_path] ?? null,
          promedio_general: f.promedio_general === null ? null : Number(f.promedio_general),
          promedio_por_criterio: (f.promedio_por_criterio as PromedioCriterio[] | null) ?? [],
          gerentes: f.gerentes_calificaron ?? 0,
        };
      })
      .sort((a, b) => a.posicion - b.posicion || a.folio - b.folio),
    enviaron: enviados.data!.length,
    totalVotantes: await totalVotantes(ronda.numero),
    etiquetaVotantes: etiquetaVotantes(ronda.numero),
    avance: avance.data
      ? { realizado_at: avance.data.realizado_at, por: nombreAdmin(avance.data.realizado_por), propuestas: avance.data.propuestas }
      : null,
    ganadoresConfirmados: ganadores.data
      ? { confirmado_at: ganadores.data.confirmado_at, por: nombreAdmin(ganadores.data.confirmado_por) }
      : null,
  };
}

export type DetalleGerente = { votante: string; puntajes: Record<string, number>; promedio: number };

/** Calificación de cada gerente por criterio para una propuesta (solo votos enviados). */
export async function detallePorGerente(rondaId: string, propuestaId: string): Promise<DetalleGerente[]> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calificaciones_enviadas")
    .select("votante_id, criterio_id, puntaje")
    .eq("ronda_id", rondaId)
    .eq("propuesta_id", propuestaId);
  if (error) throw new Error("No se pudo cargar el detalle.");
  return agruparPorGerente(data);
}

/** Todas las calificaciones enviadas de una ronda: propuesta → gerente → criterio. */
export async function detalleRonda(rondaId: string): Promise<Map<string, DetalleGerente[]>> {
  await requerirAdmin();
  const supabase = await createClient();
  const filas: { propuesta_id: string; votante_id: string; criterio_id: string; puntaje: number }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("calificaciones_enviadas")
      .select("propuesta_id, votante_id, criterio_id, puntaje")
      .eq("ronda_id", rondaId)
      .order("propuesta_id")
      .range(desde, desde + 999);
    if (error) throw new Error("No se pudo cargar el detalle.");
    filas.push(...data);
    if (data.length < 1000) break;
  }
  const porPropuesta = new Map<string, typeof filas>();
  for (const f of filas) porPropuesta.set(f.propuesta_id, [...(porPropuesta.get(f.propuesta_id) ?? []), f]);
  const r = new Map<string, DetalleGerente[]>();
  for (const [id, xs] of porPropuesta) r.set(id, await agruparPorGerente(xs));
  return r;
}

async function agruparPorGerente(filas: { votante_id: string; criterio_id: string; puntaje: number }[]): Promise<DetalleGerente[]> {
  const votantes = await obtenerTodosLosVotantes();
  const nombre = new Map(votantes.map((v) => [v.id, v.nombre]));
  const por = new Map<string, Record<string, number>>();
  for (const f of filas) por.set(f.votante_id, { ...(por.get(f.votante_id) ?? {}), [f.criterio_id]: f.puntaje });
  return [...por]
    .map(([v, puntajes]) => {
      const xs = Object.values(puntajes);
      return { votante: nombre.get(v) ?? v, puntajes, promedio: xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length) };
    })
    .sort((a, b) => a.votante.localeCompare(b.votante, "es-MX"));
}

// ---------------------------------------------------------------- avance y ganadores

const mensaje = (e: { code?: string; message: string }) =>
  e.code === "23514" || e.code === "42501" ? e.message : `No se pudo completar: ${e.message}`;

export async function pasarASiguienteRonda(rondaId: string, propuestas: string[]): Promise<Resultado<number>> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pasar_a_siguiente_ronda", { p_origen: rondaId, p_propuestas: propuestas });
  return error ? falla(mensaje(error)) : ok(data);
}

export async function deshacerAvance(rondaId: string): Promise<Resultado<null>> {
  await requerirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("deshacer_avance", { p_origen: rondaId });
  return error ? falla(mensaje(error)) : ok(null);
}

export async function confirmarGanadores(rondaId: string, ids: string[]): Promise<Resultado<null>> {
  await requerirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmar_ganadores", { p_ronda: rondaId, p_ids: ids });
  return error ? falla(mensaje(error)) : ok(null);
}

/** La ronda final (número más alto). */
export async function rondaFinal(): Promise<{ id: string; numero: number; estado: string } | null> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("rondas").select("id, numero, estado").order("numero", { ascending: false }).limit(1).maybeSingle();
  return data;
}
