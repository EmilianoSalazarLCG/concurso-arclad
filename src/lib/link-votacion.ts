import "server-only";
import { headers } from "next/headers";

/**
 * Link corto de votación: la raíz del sitio (que redirige a /votar).
 * `url` es el link completo para copiar/QR; `corto` es el texto a mostrar.
 */
export async function linkVotacion(): Promise<{ url: string; corto: string }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { url: `${protocolo}://${host}`, corto: host };
}
