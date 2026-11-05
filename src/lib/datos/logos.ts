import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { falla, ok, type Resultado } from "./tipos";

const BUCKET = "logos";
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const TIPOS: Record<string, { ext: string; firma: number[] }> = {
  "image/png": { ext: "png", firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/jpeg": { ext: "jpg", firma: [0xff, 0xd8, 0xff] },
};
/** Vigencia de las URLs firmadas (segundos). */
const URL_FIRMADA_TTL = 60 * 60;

/** Valida tamaño, tipo declarado y firma real del archivo (PNG/JPG). */
export async function validarLogo(archivo: Blob): Promise<Resultado<{ ext: string; tipo: string }>> {
  if (archivo.size === 0) return falla("El logo está vacío.");
  if (archivo.size > LOGO_MAX_BYTES) return falla("El logo pesa más de 5 MB.");
  const tipo = TIPOS[archivo.type];
  if (!tipo) return falla("El logo debe ser PNG o JPG.");
  const cabecera = new Uint8Array(await archivo.slice(0, tipo.firma.length).arrayBuffer());
  if (!tipo.firma.every((b, i) => cabecera[i] === b)) {
    return falla("El archivo no es una imagen PNG/JPG válida.");
  }
  return ok({ ext: tipo.ext, tipo: archivo.type });
}

/**
 * Sube el logo con nombre aleatorio (uuid) usando la sesión del admin
 * (las políticas de Storage exigen ser admin). Devuelve la ruta en el bucket.
 */
export async function subirLogo(archivo: Blob): Promise<Resultado<string>> {
  const v = await validarLogo(archivo);
  if (!v.ok) return v;

  const ruta = `${crypto.randomUUID()}.${v.data.ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: v.data.tipo,
    upsert: false,
  });
  if (error) return falla(`No se pudo subir el logo: ${error.message}`);
  return ok(ruta);
}

/** Borra un logo (por ejemplo, al reemplazarlo o si falla el alta de la propuesta). */
export async function borrarLogo(ruta: string): Promise<void> {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([ruta]);
}

/**
 * URLs firmadas para mostrar logos. Se generan con service role porque también
 * se usan en la votación de gerentes y en modo reunión (sin sesión de Auth).
 * IMPORTANTE: solo llamar desde páginas/acciones de servidor que ya validaron
 * quién puede ver esas propuestas. Devuelve un mapa ruta → URL.
 */
export async function urlsFirmadasLogos(rutas: string[]): Promise<Record<string, string>> {
  const unicas = [...new Set(rutas.filter(Boolean))];
  if (unicas.length === 0) return {};
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrls(unicas, URL_FIRMADA_TTL);
  if (error || !data) return {};
  const urls: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  return urls;
}

export async function urlFirmadaLogo(ruta: string): Promise<string | null> {
  return (await urlsFirmadasLogos([ruta]))[ruta] ?? null;
}
