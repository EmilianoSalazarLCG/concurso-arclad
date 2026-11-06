import "server-only";
import { obtenerVotantes } from "@/config/votantes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "./auth";
import { urlsFirmadasLogos } from "./logos";
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
  completos: number;
  totalPropuestas: number;
  votantes: { id: string; nombre: string; estado: EstadoGerente; propuestasCompletas: number }[];
};

/**
 * Avance de la votación de la ronda abierta, SIN calificaciones: solo quién completó
 * (calificó todas las propuestas activas de la ronda en todos los criterios activos),
 * quién va a medias y quién no ha empezado.
 */
export async function avanceVotacionReunion(): Promise<AvanceReunion | null> {
  await requerirAdmin();
  const ronda = await rondaAbierta();
  if (!ronda) return null;

  const db = createAdminClient();
  const [propuestas, { data: criterios, error: eC }] = await Promise.all([
    propuestasParaVotar(ronda.id),
    db.from("criterios").select("id").eq("activo", true),
  ]);
  if (eC) throw new Error("No se pudieron cargar los criterios.");

  const idsPropuestas = new Set(propuestas.map((p) => p.id));
  const idsCriterios = new Set((criterios ?? []).map((c) => c.id));
  // votante → propuesta → nº de criterios calificados
  const conteo = new Map<string, Map<string, number>>();
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db
      .from("calificaciones")
      .select("votante_id, propuesta_id, criterio_id")
      .eq("ronda_id", ronda.id)
      .range(desde, desde + 999);
    if (error) throw new Error("No se pudo cargar el avance.");
    for (const c of data) {
      if (!idsPropuestas.has(c.propuesta_id) || !idsCriterios.has(c.criterio_id)) continue;
      const porPropuesta = conteo.get(c.votante_id) ?? new Map<string, number>();
      porPropuesta.set(c.propuesta_id, (porPropuesta.get(c.propuesta_id) ?? 0) + 1);
      conteo.set(c.votante_id, porPropuesta);
    }
    if (data.length < 1000) break;
  }

  const votantes = (await obtenerVotantes()).map((v) => {
    const porPropuesta = conteo.get(v.id);
    const propuestasCompletas = [...(porPropuesta?.values() ?? [])].filter((n) => n >= idsCriterios.size).length;
    const estado: EstadoGerente =
      idsPropuestas.size > 0 && propuestasCompletas === idsPropuestas.size
        ? "completo"
        : porPropuesta?.size
          ? "en-proceso"
          : "pendiente";
    return { id: v.id, nombre: v.nombre, estado, propuestasCompletas };
  });

  return {
    ronda: { numero: ronda.numero, nombre: ronda.nombre },
    totalVotantes: votantes.length,
    completos: votantes.filter((v) => v.estado === "completo").length,
    totalPropuestas: idsPropuestas.size,
    votantes,
  };
}
