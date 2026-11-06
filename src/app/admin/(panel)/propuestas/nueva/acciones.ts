"use server";

import { NoAutorizadoError } from "@/lib/datos/auth";
import { crearSubidaLogo } from "@/lib/datos/logos";
import {
  buscarPosiblesDuplicados,
  crearPropuesta,
  type PosibleDuplicado,
} from "@/lib/datos/propuestas";
import { falla, formatearFolio, ok, type Resultado } from "@/lib/datos/tipos";
import type { CamposPropuesta } from "@/lib/validacion/propuesta";

/** Convierte excepciones en mensajes para la interfaz (sin filtrar detalles internos). */
async function protegido<T>(fn: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof NoAutorizadoError) return falla(e.message);
    console.error(e);
    return falla("Ocurrió un error inesperado. Tus datos siguen en el formulario; intenta de nuevo.");
  }
}

/** Paso 1: URL firmada para que el navegador suba el logo directo a Storage. */
export async function prepararSubidaLogo(
  tipo: string,
  tamano: number,
): Promise<Resultado<{ ruta: string; token: string }>> {
  return protegido(() => crearSubidaLogo(String(tipo), Number(tamano)));
}

/** Paso 2: guarda la propuesta con el logo ya subido (se valida todo de nuevo aquí). */
export async function guardarPropuesta(
  campos: Partial<CamposPropuesta>,
  logoRuta: string,
): Promise<Resultado<{ id: string; folio: string }>> {
  return protegido(async () => {
    const r = await crearPropuesta(campos, String(logoRuta ?? ""));
    if (!r.ok) return r;
    return ok({ id: r.data.id, folio: formatearFolio(r.data.folio) });
  });
}

/** Aviso de posibles duplicados mientras se escribe (no bloquea el guardado). */
export async function buscarDuplicados(
  participante: string,
  nombrePropuesto: string,
): Promise<PosibleDuplicado[]> {
  try {
    return await buscarPosiblesDuplicados(String(participante ?? ""), String(nombrePropuesto ?? ""));
  } catch {
    return [];
  }
}
