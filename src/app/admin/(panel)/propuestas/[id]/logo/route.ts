import { NextResponse, type NextRequest } from "next/server";
import { obtenerAdminActual } from "@/lib/datos/auth";
import { urlDescargaLogo } from "@/lib/datos/gestion";
import { obtenerPropuesta } from "@/lib/datos/propuestas";

export const dynamic = "force-dynamic";

/** Descarga el archivo original del logo como "001 - Nombre.png" (redirige a URL firmada de 60 s). */
export async function GET(request: NextRequest, { params }: RouteContext<"/admin/propuestas/[id]/logo">) {
  if (!(await obtenerAdminActual())) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });
  const p = await obtenerPropuesta(id);
  if (!p) return new NextResponse("No encontrado", { status: 404 });
  const url = await urlDescargaLogo(p);
  if (!url) return new NextResponse("No se pudo generar la descarga", { status: 502 });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
