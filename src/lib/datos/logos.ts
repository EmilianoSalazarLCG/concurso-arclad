import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { LOGO_MAX_BYTES, validarArchivoLogo } from "@/lib/validacion/propuesta";
import { requerirAdmin } from "./auth";
import { falla, ok, type Resultado } from "./tipos";

/**
 * Flujo de subida (evita el límite de 4.5 MB del cuerpo de las funciones en Vercel):
 *  1. El servidor genera una URL de subida firmada (solo admins) con nombre uuid.
 *  2. El navegador sube el archivo directo a Storage con ese token.
 *  3. El servidor descarga el archivo y valida tamaño y firma real antes de guardarlo.
 */

const BUCKET = "logos";
const EXTENSION = { "image/png": "png", "image/jpeg": "jpg" } as const;
const FIRMAS: Record<string, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpg: [0xff, 0xd8, 0xff],
};
const RUTA_VALIDA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$/;
/** Vigencia de las URLs firmadas para ver logos (segundos). */
const URL_FIRMADA_TTL = 60 * 60;

export async function crearSubidaLogo(
  tipo: string,
  tamano: number,
): Promise<Resultado<{ ruta: string; token: string }>> {
  await requerirAdmin();
  const error = validarArchivoLogo({ tipo, tamano });
  if (error) return falla(error);

  const ruta = `${crypto.randomUUID()}.${EXTENSION[tipo as keyof typeof EXTENSION]}`;
  const supabase = await createClient(); // sesión del admin: aplica la política de Storage
  const { data, error: e } = await supabase.storage.from(BUCKET).createSignedUploadUrl(ruta);
  if (e || !data) return falla(`No se pudo preparar la subida del logo: ${e?.message ?? "sin respuesta"}`);
  return ok({ ruta: data.path, token: data.token });
}

/** Comprueba que el logo subido exista, pese ≤ 5 MB y sea realmente PNG/JPG. Si no, lo borra. */
export async function verificarLogoSubido(ruta: string): Promise<Resultado<string>> {
  const m = RUTA_VALIDA.exec(ruta);
  if (!m) return falla("La ruta del logo no es válida.");

  const { data, error } = await createAdminClient().storage.from(BUCKET).download(ruta);
  if (error || !data) return falla("No se encontró el logo subido. Vuelve a intentarlo.");

  const firma = FIRMAS[m[1]];
  const cabecera = new Uint8Array(await data.slice(0, firma.length).arrayBuffer());
  const valido = data.size > 0 && data.size <= LOGO_MAX_BYTES && firma.every((b, i) => cabecera[i] === b);
  if (!valido) {
    await borrarLogo(ruta);
    return falla("El archivo del logo no es una imagen PNG/JPG válida de máximo 5 MB.");
  }
  return ok(ruta);
}

/** Borra un logo (al reemplazarlo, si falla el alta o si no pasó la validación). */
export async function borrarLogo(ruta: string): Promise<void> {
  await createAdminClient().storage.from(BUCKET).remove([ruta]);
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
