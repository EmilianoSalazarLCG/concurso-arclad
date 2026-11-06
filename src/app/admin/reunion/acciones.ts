"use server";

import { NoAutorizadoError } from "@/lib/datos/auth";
import {
  avanceVotacionReunion,
  estadoReunion,
  ganadoresReunion,
  propuestasReunion,
  resultadosReunion,
  type AvanceReunion,
  type EstadoReunion,
  type GanadorReunion,
  type PropuestaReunion,
  type ResultadosReunion,
} from "@/lib/datos/reunion";
import { falla, ok, type Resultado } from "@/lib/datos/tipos";

async function protegido<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof NoAutorizadoError) return falla(e.message);
    console.error(e);
    return falla("No se pudo actualizar. Revisa la conexión.");
  }
}

/** Propuestas a proyectar, con URLs firmadas nuevas (también sirve para renovarlas). */
export async function cargarPropuestasReunion(fuente: string): Promise<Resultado<PropuestaReunion[]>> {
  return protegido(() => propuestasReunion(String(fuente ?? "activas")));
}

export async function consultarEstadoReunion(): Promise<Resultado<EstadoReunion>> {
  return protegido(() => estadoReunion());
}

export async function cargarResultadosReunion(rondaId: string): Promise<Resultado<ResultadosReunion | null>> {
  return protegido(() => resultadosReunion(String(rondaId ?? "")));
}

export async function cargarGanadoresReunion(): Promise<Resultado<GanadorReunion[] | null>> {
  return protegido(() => ganadoresReunion());
}

export async function consultarAvanceVotacion(): Promise<Resultado<AvanceReunion | null>> {
  return protegido(() => avanceVotacionReunion());
}
