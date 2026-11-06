"use server";

import { revalidatePath } from "next/cache";
import { NoAutorizadoError } from "@/lib/datos/auth";
import { deshacerAvance, detallePorGerente, pasarASiguienteRonda, type DetalleGerente } from "@/lib/datos/resultados";
import { falla, ok, type Resultado } from "@/lib/datos/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function protegido<T>(fn: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    const r = await fn();
    revalidatePath("/admin/rondas", "layout");
    return r;
  } catch (e) {
    if (e instanceof NoAutorizadoError) return falla(e.message);
    console.error(e);
    return falla("Ocurrió un error inesperado. Intenta de nuevo.");
  }
}

export async function detalle(rondaId: string, propuestaId: string): Promise<Resultado<DetalleGerente[]>> {
  return protegido(async () =>
    UUID.test(rondaId) && UUID.test(propuestaId) ? ok(await detallePorGerente(rondaId, propuestaId)) : falla("Datos no válidos."),
  );
}

export async function pasar(rondaId: string, propuestas: string[]): Promise<Resultado<number>> {
  return protegido(async () =>
    UUID.test(rondaId) && Array.isArray(propuestas) && propuestas.every((p) => UUID.test(p))
      ? pasarASiguienteRonda(rondaId, propuestas)
      : falla("Datos no válidos."),
  );
}

export async function deshacer(rondaId: string): Promise<Resultado<null>> {
  return protegido(async () => (UUID.test(rondaId) ? deshacerAvance(rondaId) : falla("Ronda no válida.")));
}
