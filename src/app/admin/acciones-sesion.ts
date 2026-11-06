"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { error?: string; correo?: string };

function destinoSeguro(valor: FormDataEntryValue | null): string {
  const v = typeof valor === "string" ? valor : "";
  // Solo rutas internas del panel (evita redirecciones abiertas).
  return /^\/admin(\/[\w\-/]*)?(\?[\w=&%-]*)?$/.test(v) && !v.startsWith("/admin/login") ? v : "/admin";
}

function mensajeError(codigo: string | undefined, estado: number | undefined): string {
  switch (codigo) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Tu correo aún no está confirmado. Pide a un administrador que lo confirme.";
    case "user_banned":
      return "Tu usuario está bloqueado. Contacta a un administrador.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  }
  if (estado === 429) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  if (estado && estado >= 500) return "El servicio de acceso no responde. Intenta de nuevo en un momento.";
  return "No se pudo iniciar sesión. Intenta de nuevo.";
}

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const contrasena = String(formData.get("contrasena") ?? "");

  if (!correo || !contrasena) return { error: "Escribe tu correo y tu contraseña.", correo };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "El correo no tiene un formato válido.", correo };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error || !data.user) return { error: mensajeError(error?.code, error?.status), correo };

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return {
      error: "No tienes acceso al panel. Si crees que es un error, contacta a People & Culture.",
      correo,
    };
  }

  redirect(destinoSeguro(formData.get("siguiente")));
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
