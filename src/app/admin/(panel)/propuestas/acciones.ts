"use server";

import { NoAutorizadoError } from "@/lib/datos/auth";
import { enlacesLogos } from "@/lib/datos/gestion";
import { crearSubidaLogo } from "@/lib/datos/logos";
import {
  actualizarPropuesta,
  buscarPosiblesDuplicados,
  crearPropuesta,
  descartarPropuesta,
  restaurarPropuesta,
  type PosibleDuplicado,
} from "@/lib/datos/propuestas";
import { falla, formatearFolio, ok, type Resultado } from "@/lib/datos/tipos";
import { leerFiltros } from "@/lib/validacion/filtros";
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL firmada para que el navegador suba el logo directo a Storage. */
export async function prepararSubidaLogo(
  tipo: string,
  tamano: number,
): Promise<Resultado<{ ruta: string; token: string }>> {
  return protegido(() => crearSubidaLogo(String(tipo), Number(tamano)));
}

/** Alta con el logo ya subido (se valida todo de nuevo aquí). */
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

/** Edición. `logoRutaNueva` solo si se reemplazó el logo; el anterior se borra al guardar. */
export async function editarPropuesta(
  id: string,
  campos: Partial<CamposPropuesta>,
  logoRutaNueva: string | null,
): Promise<Resultado<{ id: string; folio: string }>> {
  return protegido(async () => {
    if (!UUID.test(String(id))) return falla("Propuesta no válida.");
    const r = await actualizarPropuesta(id, campos, logoRutaNueva ? String(logoRutaNueva) : null);
    if (!r.ok) return r;
    return ok({ id: r.data.id, folio: formatearFolio(r.data.folio) });
  });
}

export async function descartar(id: string, motivo: string): Promise<Resultado<{ folio: string }>> {
  return protegido(async () => {
    if (!UUID.test(String(id))) return falla("Propuesta no válida.");
    const r = await descartarPropuesta(id, String(motivo ?? ""));
    return r.ok ? ok({ folio: formatearFolio(r.data.folio) }) : r;
  });
}

export async function restaurar(id: string): Promise<Resultado<{ folio: string }>> {
  return protegido(async () => {
    if (!UUID.test(String(id))) return falla("Propuesta no válida.");
    const r = await restaurarPropuesta(id);
    return r.ok ? ok({ folio: formatearFolio(r.data.folio) }) : r;
  });
}

/** Aviso de posibles duplicados mientras se escribe (no bloquea el guardado). */
export async function buscarDuplicados(
  participante: string,
  nombrePropuesto: string,
  excluirId?: string,
): Promise<PosibleDuplicado[]> {
  try {
    const excluir = excluirId && UUID.test(excluirId) ? excluirId : undefined;
    return await buscarPosiblesDuplicados(String(participante ?? ""), String(nombrePropuesto ?? ""), excluir);
  } catch {
    return [];
  }
}

/** Enlaces firmados de los logos que cumplen los filtros (el navegador arma el ZIP). */
export async function prepararZipLogos(query: string): Promise<Resultado<{ nombre: string; url: string }[]>> {
  return protegido(async () => ok(await enlacesLogos(leerFiltros(new URLSearchParams(String(query ?? ""))))));
}
