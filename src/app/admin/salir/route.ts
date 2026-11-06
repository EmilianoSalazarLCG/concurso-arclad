import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Cierra la sesión y regresa al login. Se usa cuando un usuario con sesión
 * no está en `admins` (motivo=sin-acceso). El botón "Cerrar sesión" usa una
 * Server Action (POST).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const motivo = request.nextUrl.searchParams.get("motivo");
  const destino = new URL("/admin/login", request.url);
  if (motivo === "sin-acceso") destino.searchParams.set("motivo", motivo);
  return NextResponse.redirect(destino, { status: 303 });
}
