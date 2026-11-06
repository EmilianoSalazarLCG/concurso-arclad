"use server";

import { NoAutorizadoError } from "@/lib/datos/auth";
import {
  avanceVotacionReunion,
  propuestasReunion,
  rondaAbierta,
  type AvanceReunion,
  type PropuestaReunion,
  type RondaReunion,
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

export async function consultarRondaAbierta(): Promise<Resultado<RondaReunion | null>> {
  return protegido(() => rondaAbierta());
}

export async function consultarAvanceVotacion(): Promise<Resultado<AvanceReunion | null>> {
  return protegido(() => avanceVotacionReunion());
}
