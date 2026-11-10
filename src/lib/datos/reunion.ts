import "server-only";
import { etiquetaVotantes, obtenerVotantes } from "@/config/votantes";
import { analizarCorte } from "@/lib/corte";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "./auth";
import { urlsFirmadasLogos } from "./logos";
import { resultadosDeRonda, rondaFinal } from "./resultados";
import { propuestasParaVotar } from "./rondas";

/**
 * Datos del modo reunión (solo admins). Por diseño NUNCA incluyen notas internas,
 * estado ni quién capturó: solo lo que se puede proyectar.
 */
export type PropuestaReunion = {
  id: string;
  folio: number;
  nombre_propuesto: string;
  significado: string;
  participante_nombre: string;
  area: string;
  ciudad: string;
  logoUrl: string | null;
};

/** "activas" o el id de una ronda. */
export type FuenteReunion = string;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function propuestasReunion(fuente: FuenteReunion): Promise<PropuestaReunion[]> {
  await requerirAdmin();

  let filas: (Omit<PropuestaReunion, "logoUrl"> & { logo_path: string })[];
  if (fuente === "activas") {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("propuestas")
      .select("id, folio, nombre_propuesto, significado, participante_nombre, area, ciudad, logo_path")
      .eq("estado", "activa")
      .order("folio");
    if (error) throw new Error(`No se pudieron cargar las propuestas: ${error.message}`);
    filas = data;
  } else if (UUID.test(fuente)) {
    filas = await propuestasParaVotar(fuente); // solo activas de la ronda, sin datos internos
  } else {
    return [];
  }

  const urls = await urlsFirmadasLogos(filas.map((f) => f.logo_path));
  return filas.map(({ logo_path, ...p }) => ({ ...p, logoUrl: urls[logo_path] ?? null }));
}

export type RondaReunion = { id: string; numero: number; nombre: string; estado: string };

export async function rondasReunion(): Promise<RondaReunion[]> {
  await requerirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("rondas").select("id, numero, nombre, estado").order("numero");
  if (error) throw new Error(`No se pudieron cargar las rondas: ${error.message}`);
  return data;
}

export async function rondaAbierta(): Promise<RondaReunion | null> {
  return (await rondasReunion()).find((r) => r.estado === "abierta") ?? null;
}

export type EstadoGerente = "completo" | "en-proceso" | "pendiente";
export type AvanceReunion = {
  ronda: { numero: number; nombre: string };
  totalVotantes: number;
  /** "gerentes" o "personas", según quién vota en la ronda. */
  etiqueta: string;
  completos: number;
  totalPropuestas: number;
  votantes: { id: string; nombre: string; estado: EstadoGerente }[];
};

/**
 * Avance de la votación de la ronda abierta, SIN calificaciones:
 * "completo" = envió su voto; "en-proceso" = tiene avance sin enviar; "pendiente" = no ha empezado.
 */
export async function avanceVotacionReunion(): Promise<AvanceReunion | null> {
  await requerirAdmin();
  const ronda = await rondaAbierta();
  if (!ronda) return null;

  const db = createAdminClient();
  const [propuestas, enviados, conAvance] = await Promise.all([
    propuestasParaVotar(ronda.id),
    db.from("votos_enviados").select("votante_id").eq("ronda_id", ronda.id),
    votantesConAvance(db, ronda.id),
  ]);
  if (enviados.error) throw new Error("No se pudo cargar el avance.");
  const enviaron = new Set(enviados.data.map((v) => v.votante_id));
  const empezaron = conAvance;

  const votantes = (await obtenerVotantes(ronda.numero)).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    estado: (enviaron.has(v.id) ? "completo" : empezaron.has(v.id) ? "en-proceso" : "pendiente") as EstadoGerente,
  }));

  return {
    ronda: { numero: ronda.numero, nombre: ronda.nombre },
    totalVotantes: votantes.length,
    etiqueta: etiquetaVotantes(ronda.numero),
    completos: enviaron.size,
    totalPropuestas: propuestas.length,
    votantes,
  };
}

/**
 * Ids de votantes con avance en la ronda. Paginado: con todo el personal votando hay miles de
 * calificaciones y la API devuelve máximo 1000 filas por consulta.
 */
async function votantesConAvance(db: ReturnType<typeof createAdminClient>, rondaId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db
      .from("calificaciones")
      .select("id, votante_id")
      .eq("ronda_id", rondaId)
      .order("id")
      .range(desde, desde + 999);
    if (error) throw new Error("No se pudo cargar el avance.");
    for (const f of data) ids.add(f.votante_id);
    if (data.length < 1000) break;
  }
  return ids;
}

// ---------------------------------------------------------------- resultados y ganadores (Fase 7)

export type EstadoReunion = {
  abierta: RondaReunion | null;
  cerradas: RondaReunion[];
  ganadoresListos: boolean;
};

export async function estadoReunion(): Promise<EstadoReunion> {
  await requerirAdmin();
  const rondas = await rondasReunion();
  const supabase = await createClient();
  const final = rondas[rondas.length - 1];
  const { count } = final
    ? await supabase.from("ganadores_confirmados").select("*", { count: "exact", head: true }).eq("ronda_id", final.id)
    : { count: 0 };
  return {
    abierta: rondas.find((r) => r.estado === "abierta") ?? null,
    cerradas: rondas.filter((r) => r.estado === "cerrada"),
    ganadoresListos: final?.estado === "cerrada" && (count ?? 0) > 0,
  };
}

export type ResultadosReunion = {
  ronda: { numero: number; nombre: string; top_n: number };
  esFinal: boolean;
  siguiente: number | null;
  filas: { propuesta_id: string; posicion: number; folio: number; nombre: string; logoUrl: string | null; promedio: number | null; pasa: boolean }[];
};

/** Ranking para proyectar: SIN calificaciones por gerente ni autor. Solo rondas cerradas. */
export async function resultadosReunion(rondaId: string): Promise<ResultadosReunion | null> {
  const d = await resultadosDeRonda(rondaId);
  if (!d || d.ronda.estado !== "cerrada") return null;
  const esFinal = d.ronda.numero === d.totalRondas;
  const pasan = new Set(
    esFinal && d.ganadoresConfirmados
      ? d.filas.filter((f) => f.posicion_final).map((f) => f.propuesta_id)
      : d.avance
        ? d.avanzadas
        : analizarCorte(d.filas, d.ronda.top_n).dentro,
  );
  return {
    ronda: { numero: d.ronda.numero, nombre: d.ronda.nombre, top_n: d.ronda.top_n },
    esFinal,
    siguiente: d.siguiente?.numero ?? null,
    filas: d.filas.map((f) => ({
      propuesta_id: f.propuesta_id,
      posicion: f.posicion,
      folio: f.folio,
      nombre: f.nombre_propuesto,
      logoUrl: f.logoUrl,
      promedio: f.promedio_general,
      pasa: pasan.has(f.propuesta_id),
    })),
  };
}

export type GanadorReunion = {
  lugar: number;
  folio: number;
  nombre: string;
  significado: string;
  participante: string;
  area: string;
  ciudad: string;
  logoUrl: string | null;
  promedio: number | null;
};

/** Top 3 confirmado (con autor, que se muestra al revelar). Null si aún no se confirma. */
export async function ganadoresReunion(): Promise<GanadorReunion[] | null> {
  const final = await rondaFinal();
  if (!final) return null;
  const d = await resultadosDeRonda(final.id);
  if (!d || d.ronda.estado !== "cerrada" || !d.ganadoresConfirmados) return null;
  return d.filas
    .filter((f) => f.posicion_final)
    .sort((a, b) => a.posicion_final! - b.posicion_final!)
    .map((f) => ({
      lugar: f.posicion_final!,
      folio: f.folio,
      nombre: f.nombre_propuesto,
      significado: f.significado,
      participante: f.participante,
      area: f.area,
      ciudad: f.ciudad,
      logoUrl: f.logoUrl,
      promedio: f.promedio_general,
    }));
}
