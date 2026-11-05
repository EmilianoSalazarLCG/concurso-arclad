import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Admin } from "./tipos";

/**
 * Admin con sesión activa, o null si no hay sesión o el usuario no está en `admins`.
 * getUser() valida el token contra Supabase Auth (no confía solo en la cookie).
 */
export async function obtenerAdminActual(): Promise<Admin | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("admins").select("*").eq("user_id", user.id).maybeSingle();
  return data;
}

export class NoAutorizadoError extends Error {
  constructor() {
    super("No autorizado: se requiere una sesión de administrador.");
    this.name = "NoAutorizadoError";
  }
}

/** Lanza NoAutorizadoError si quien llama no es admin. Usar al inicio de cada acción de admin. */
export async function requerirAdmin(): Promise<Admin> {
  const admin = await obtenerAdminActual();
  if (!admin) throw new NoAutorizadoError();
  return admin;
}
