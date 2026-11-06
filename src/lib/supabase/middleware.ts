import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase Auth en cada request y propaga las cookies.
 * Se invoca desde src/proxy.ts (en Next 16 `middleware` se renombró a `proxy`).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // No poner lógica entre createServerClient y getUser(): refresca el token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Primera barrera para /admin/*: sin sesión → login. (La validación de que el
  // usuario esté en `admins` se hace en el servidor, en cada página y acción.)
  const { pathname, search } = request.nextUrl;
  const esPanel = pathname === "/admin" || pathname.startsWith("/admin/");
  const esPublica = pathname === "/admin/login" || pathname === "/admin/salir";
  if (esPanel && !esPublica && !user) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/admin/login";
    destino.search = `?siguiente=${encodeURIComponent(pathname + search)}`;
    const redireccion = NextResponse.redirect(destino);
    response.cookies.getAll().forEach((c) => redireccion.cookies.set(c));
    return redireccion;
  }

  return response;
}
