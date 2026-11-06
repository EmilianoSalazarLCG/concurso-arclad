"use server";

import {
  datosVotacion,
  enviarVotoPublico,
  estadoVotacion,
  guardarCalificacionPublica,
  type DatosVotacion,
  type EstadoVotacion,
} from "@/lib/datos/votacion";

/**
 * Acciones PÚBLICAS de la votación (sin login). Toda escritura pasa por
 * registrarCalificaciones() / enviar_voto(), que validan votante, ronda abierta,
 * propuesta en la ronda, criterio activo y puntaje 1–5.
 */

export type RespuestaCarga =
  | { tipo: "datos"; datos: DatosVotacion }
  | { tipo: "estado"; estado: EstadoVotacion }
  | { tipo: "error"; error: string };

export type RespuestaEscritura<T = null> = { ok: true; data: T } | { ok: false; error: string; cerrada: boolean };

const cerrada = (error: string) => error.includes("no está abierta");

export async function cargarVotacion(votanteId: string): Promise<RespuestaCarga> {
  try {
    const r = await datosVotacion(String(votanteId ?? ""));
    if (r.ok) return { tipo: "datos", datos: r.data };
    if (r.estado) return { tipo: "estado", estado: r.estado };
    return { tipo: "error", error: r.error };
  } catch (e) {
    console.error(e);
    return { tipo: "error", error: "No se pudo cargar la votación. Revisa tu conexión e intenta de nuevo." };
  }
}

export async function guardarCalificacion(
  votanteId: string,
  rondaId: string,
  propuestaId: string,
  criterioId: string,
  puntaje: number,
): Promise<RespuestaEscritura> {
  try {
    const r = await guardarCalificacionPublica(String(votanteId), String(rondaId), String(propuestaId), String(criterioId), Number(puntaje));
    return r.ok ? { ok: true, data: null } : { ok: false, error: r.error, cerrada: cerrada(r.error) };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "No se pudo guardar.", cerrada: false };
  }
}

export async function enviarVoto(votanteId: string, rondaId: string): Promise<RespuestaEscritura<{ enviadoAt: string }>> {
  try {
    const r = await enviarVotoPublico(String(votanteId), String(rondaId));
    return r.ok ? r : { ok: false, error: r.error, cerrada: cerrada(r.error) };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "No se pudo enviar tu voto. Revisa tu conexión e intenta de nuevo.", cerrada: false };
  }
}

export async function consultarEstadoVotacion(): Promise<EstadoVotacion | null> {
  try {
    return await estadoVotacion();
  } catch {
    return null;
  }
}
