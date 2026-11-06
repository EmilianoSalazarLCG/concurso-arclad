import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Verifica en vivo la conexión con Supabase (Auth + Storage con la sesión del admin). */
export async function verificarConexion(): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, error: "Faltan variables de entorno de Supabase." };
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey }, cache: "no-store" });
    if (!res.ok) return { ok: false, error: `Supabase respondió ${res.status}.` };
    const { error } = await (await createClient()).storage.listBuckets();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}
