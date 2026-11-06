import "server-only";
import { obtenerVotante } from "@/config/votantes";
import { MOSTRAR_AUTOR_EN_VOTACION } from "@/config/votacion";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlsFirmadasLogos } from "./logos";
import { criteriosActivos, propuestasParaVotar } from "./rondas";
import { falla, ok, type Resultado } from "./tipos";
import { registrarCalificaciones } from "./votos";

/**
 * Datos de la página PÚBLICA de votación (/votar). Sin login: usa service role y
 * devuelve SOLO lo necesario para calificar. Nunca autor (salvo configuración),
 * notas internas, resultados ni calificaciones de otros gerentes.
 */

export type RondaPublica = { id: string; numero: number; nombre: string };

export type EstadoVotacion =
  | { tipo: "abierta"; ronda: RondaPublica }
  | { tipo: "sin-abrir" }
  | { tipo: "cerrada"; ronda: RondaPublica; hayMasRondas: boolean };

export async function estadoVotacion(): Promise<EstadoVotacion> {
  const { data, error } = await createAdminClient().from("rondas").select("id, numero, nombre, estado").order("numero");
  if (error) throw new Error("No se pudo consultar la votación.");
  const abierta = data.find((r) => r.estado === "abierta");
  if (abierta) return { tipo: "abierta", ronda: { id: abierta.id, numero: abierta.numero, nombre: abierta.nombre } };
  const cerradas = data.filter((r) => r.estado === "cerrada");
  if (cerradas.length === 0) return { tipo: "sin-abrir" };
  const ultima = cerradas[cerradas.length - 1];
  return {
    tipo: "cerrada",
    ronda: { id: ultima.id, numero: ultima.numero, nombre: ultima.nombre },
    hayMasRondas: data.some((r) => r.estado === "pendiente" && r.numero > ultima.numero),
  };
}

export type PropuestaVotacion = {
  id: string;
  folio: number;
  nombre_propuesto: string;
  significado: string;
  logoUrl: string | null;
  autor?: { participante: string; area: string; ciudad: string };
};

export type CriterioVotacion = { id: string; nombre: string; descripcion: string | null };

export type DatosVotacion = {
  ronda: RondaPublica;
  criterios: CriterioVotacion[];
  propuestas: PropuestaVotacion[];
  /** Calificaciones propias guardadas: { propuestaId: { criterioId: puntaje } }. */
  calificaciones: Record<string, Record<string, number>>;
  enviadoAt: string | null;
  /** Hay cambios guardados después del último envío. */
  cambiosSinEnviar: boolean;
};

/** Orden aleatorio estable por gerente y ronda (mismo orden cada vez, distinto entre gerentes). */
function ordenEstable<T extends { id: string; folio: number }>(xs: T[], semilla: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  const azar = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = [...xs].sort((a, b) => a.folio - b.folio);
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const mapa = (filas: { propuesta_id: string; criterio_id: string; puntaje: number }[]) => {
  const m: Record<string, Record<string, number>> = {};
  for (const c of filas) (m[c.propuesta_id] ??= {})[c.criterio_id] = c.puntaje;
  return m;
};

export async function datosVotacion(votanteId: string): Promise<Resultado<DatosVotacion> & { estado?: EstadoVotacion }> {
  const votante = await obtenerVotante(String(votanteId ?? ""));
  if (!votante) return falla("Elige tu nombre de la lista.");
  const estado = await estadoVotacion();
  if (estado.tipo !== "abierta") return { ...falla("La votación no está abierta."), estado };
  const ronda = estado.ronda;

  const db = createAdminClient();
  const [propuestas, criterios, propias, enviadas, envio] = await Promise.all([
    propuestasParaVotar(ronda.id),
    criteriosActivos(),
    db.from("calificaciones").select("propuesta_id, criterio_id, puntaje").eq("ronda_id", ronda.id).eq("votante_id", votante.id),
    db.from("calificaciones_enviadas").select("propuesta_id, criterio_id, puntaje").eq("ronda_id", ronda.id).eq("votante_id", votante.id),
    db.from("votos_enviados").select("enviado_at").eq("ronda_id", ronda.id).eq("votante_id", votante.id).maybeSingle(),
  ]);
  if (propias.error || enviadas.error || envio.error) throw new Error("No se pudieron cargar tus calificaciones.");

  const idsPropuestas = new Set(propuestas.map((p) => p.id));
  const idsCriterios = new Set(criterios.map((c) => c.id));
  const vigentes = (filas: { propuesta_id: string; criterio_id: string; puntaje: number }[]) =>
    filas.filter((c) => idsPropuestas.has(c.propuesta_id) && idsCriterios.has(c.criterio_id));
  const calificaciones = mapa(vigentes(propias.data));
  const enviadasMapa = mapa(vigentes(enviadas.data));
  const cambiosSinEnviar = Boolean(envio.data) && JSON.stringify(ordenarMapa(calificaciones)) !== JSON.stringify(ordenarMapa(enviadasMapa));

  const urls = await urlsFirmadasLogos(propuestas.map((p) => p.logo_path));
  return ok({
    ronda,
    criterios: criterios.map((c) => ({ id: c.id, nombre: c.nombre, descripcion: c.descripcion })),
    propuestas: ordenEstable(propuestas, `${votante.id}:${ronda.id}`).map((p) => ({
      id: p.id,
      folio: p.folio,
      nombre_propuesto: p.nombre_propuesto,
      significado: p.significado,
      logoUrl: urls[p.logo_path] ?? null,
      ...(MOSTRAR_AUTOR_EN_VOTACION ? { autor: { participante: p.participante_nombre, area: p.area, ciudad: p.ciudad } } : {}),
    })),
    calificaciones,
    enviadoAt: envio.data?.enviado_at ?? null,
    cambiosSinEnviar,
  });
}

function ordenarMapa(m: Record<string, Record<string, number>>) {
  return Object.keys(m)
    .sort()
    .map((p) => [p, Object.keys(m[p]).sort().map((c) => [c, m[p][c]])]);
}

/** Guarda una calificación (avance). Toda la validación está en registrarCalificaciones(). */
export async function guardarCalificacionPublica(
  votanteId: string,
  rondaId: string,
  propuestaId: string,
  criterioId: string,
  puntaje: number,
): Promise<Resultado<null>> {
  const r = await registrarCalificaciones({ votanteId, rondaId, propuestaId, puntajes: [{ criterioId, puntaje }] });
  return r.ok ? ok(null) : r;
}

/** Envía el voto: valida en el servidor que esté todo calificado y la base lo vuelve a validar. */
export async function enviarVotoPublico(votanteId: string, rondaId: string): Promise<Resultado<{ enviadoAt: string }>> {
  const votante = await obtenerVotante(String(votanteId ?? ""));
  if (!votante) return falla("Votante no válido.");
  const datos = await datosVotacion(votante.id);
  if (!datos.ok) return datos;
  if (datos.data.ronda.id !== rondaId) return falla("La votación no está abierta.");

  const { propuestas, criterios, calificaciones } = datos.data;
  const incompletas = propuestas.filter((p) => criterios.some((c) => !calificaciones[p.id]?.[c.id]));
  if (incompletas.length > 0) {
    return falla(`Faltan por calificar ${incompletas.length} propuesta${incompletas.length === 1 ? "" : "s"}.`);
  }

  const { data, error } = await createAdminClient().rpc("enviar_voto", { p_ronda: rondaId, p_votante: votante.id });
  if (error) {
    if (error.message.includes("no está abierta")) return falla("La votación no está abierta.");
    if (error.message.includes("Faltan calificaciones")) return falla(error.message);
    return falla("No se pudo enviar tu voto. Intenta de nuevo.");
  }
  return ok({ enviadoAt: data as string });
}
