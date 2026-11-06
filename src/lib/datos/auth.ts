import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Admin } from "./tipos";

type EstadoSesion =
  | { tipo: "sin-sesion" }
  | { tipo: "sin-acceso"; userId: string }
  | { tipo: "admin"; admin: Admin };

/**
 * Estado de la sesión actual (memorizado por request).
 * getUser() valida el token contra Supabase Auth (no confía solo en la cookie).
 */
const estadoSesion = cache(async (): Promise<EstadoSesion> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { tipo: "sin-sesion" };

  const { data } = await supabase.from("admins").select("*").eq("user_id", user.id).maybeSingle();
  return data ? { tipo: "admin", admin: data } : { tipo: "sin-acceso", userId: user.id };
});

/** Admin con sesión activa, o null si no hay sesión o el usuario no está en `admins`. */
export async function obtenerAdminActual(): Promise<Admin | null> {
  const s = await estadoSesion();
  return s.tipo === "admin" ? s.admin : null;
}

export class NoAutorizadoError extends Error {
  constructor() {
    super("Tu sesión expiró o no tienes acceso. Vuelve a iniciar sesión.");
    this.name = "NoAutorizadoError";
  }
}

/** Para Server Actions y funciones de datos: lanza NoAutorizadoError si no es admin. */
export async function requerirAdmin(): Promise<Admin> {
  const admin = await obtenerAdminActual();
  if (!admin) throw new NoAutorizadoError();
  return admin;
}

/**
 * Para páginas y layouts de /admin: redirige al login si no hay sesión, o cierra
 * la sesión y avisa "No tienes acceso" si el usuario no está en `admins`.
 */
export async function exigirAdmin(): Promise<Admin> {
  const s = await estadoSesion();
  if (s.tipo === "sin-sesion") redirect("/admin/login");
  if (s.tipo === "sin-acceso") redirect("/admin/salir?motivo=sin-acceso");
  return s.admin;
}
