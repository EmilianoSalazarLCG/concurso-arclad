import type { FileObject } from "@supabase/storage-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Lógica de logos huérfanos (archivos en Storage que ninguna propuesta usa).
 * Recibe un cliente con service role. La protección de admin la hace quien llama
 * (src/app/admin/(panel)/mantenimiento/acciones.ts).
 */

export type ArchivoHuerfano = { nombre: string; tamano: number; creado: string };

const BUCKET = "logos";

async function listarObjetos(db: SupabaseClient<Database>) {
  const objetos: FileObject[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list("", {
      limit: 1000,
      offset,
      sortBy: { column: "created_at", order: "asc" },
    });
    if (error) throw new Error(`No se pudo listar Storage: ${error.message}`);
    objetos.push(...data.filter((o) => o.id)); // sin carpetas
    if (data.length < 1000) return objetos;
  }
}

async function rutasEnUso(db: SupabaseClient<Database>): Promise<Set<string>> {
  const usadas = new Set<string>();
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db.from("propuestas").select("logo_path").range(desde, desde + 999);
    if (error) throw new Error(`No se pudieron leer las propuestas: ${error.message}`);
    data.forEach((p) => usadas.add(p.logo_path));
    if (data.length < 1000) return usadas;
  }
}

/** Huérfanos con más de `minHoras` de antigüedad (elegibles) y cuántos son más recientes. */
export async function calcularHuerfanos(
  db: SupabaseClient<Database>,
  minHoras: number,
  ahora = Date.now(),
): Promise<{ elegibles: ArchivoHuerfano[]; recientes: number }> {
  const [objetos, usadas] = await Promise.all([listarObjetos(db), rutasEnUso(db)]);
  const limite = ahora - minHoras * 3600_000;
  const elegibles: ArchivoHuerfano[] = [];
  let recientes = 0;
  for (const o of objetos) {
    if (usadas.has(o.name)) continue;
    // Sin fecha de creación: se considera reciente (nunca se borra por error).
    const creado = o.created_at ? new Date(o.created_at).getTime() : ahora;
    if (creado <= limite) {
      elegibles.push({ nombre: o.name, tamano: Number(o.metadata?.size ?? 0), creado: o.created_at! });
    } else {
      recientes++;
    }
  }
  return { elegibles, recientes };
}

/** Recalcula en el momento y borra solo los que siguen siendo huérfanos elegibles. */
export async function borrarHuerfanos(
  db: SupabaseClient<Database>,
  minHoras: number,
  ahora = Date.now(),
): Promise<number> {
  const { elegibles } = await calcularHuerfanos(db, minHoras, ahora);
  let borrados = 0;
  for (let i = 0; i < elegibles.length; i += 100) {
    const lote = elegibles.slice(i, i + 100).map((e) => e.nombre);
    const { data, error } = await db.storage.from(BUCKET).remove(lote);
    if (error) throw new Error(`No se pudieron borrar los archivos: ${error.message}`);
    borrados += data.length;
  }
  return borrados;
}
