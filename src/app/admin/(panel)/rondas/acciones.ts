"use server";

import { revalidatePath } from "next/cache";
import { NoAutorizadoError } from "@/lib/datos/auth";
import {
  abrirRonda,
  agregarPropuestasARonda,
  agregarTodasLasActivas,
  cerrarRonda,
  quitarPropuestaDeRonda,
} from "@/lib/datos/rondas";
import { falla, type Resultado } from "@/lib/datos/tipos";

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

const valida = (id: string) => UUID.test(String(id));

export async function abrir(rondaId: string) {
  return protegido(async () => (valida(rondaId) ? abrirRonda(rondaId) : falla("Ronda no válida.")));
}
export async function cerrar(rondaId: string) {
  return protegido(async () => (valida(rondaId) ? cerrarRonda(rondaId) : falla("Ronda no válida.")));
}
export async function agregarTodas(rondaId: string) {
  return protegido(async () => (valida(rondaId) ? agregarTodasLasActivas(rondaId) : falla("Ronda no válida.")));
}
export async function agregar(rondaId: string, propuestaId: string) {
  return protegido(async () =>
    valida(rondaId) && valida(propuestaId) ? agregarPropuestasARonda(rondaId, [propuestaId]) : falla("Datos no válidos."),
  );
}
export async function quitar(rondaId: string, propuestaId: string) {
  return protegido(async () =>
    valida(rondaId) && valida(propuestaId) ? quitarPropuestaDeRonda(rondaId, propuestaId) : falla("Datos no válidos."),
  );
}
