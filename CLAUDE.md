@AGENTS.md

# Concurso ARclad

Aplicación web para gestionar un concurso interno de naming y logo para un proyecto del cliente ARclad.
- Nombre del paquete: `concurso-arclad`
- Nombre visible: **Concurso ARclad**

## Contexto del proyecto
- Concurso donde colaboradores proponen nombre + logo para un proyecto.
- Los ADMINISTRADORES (equipo de People & Culture) capturan las propuestas; los
  participantes no entran a la app.
- Cada propuesta: nombre de la persona, área, ciudad, nombre propuesto, logo (PNG/JPG),
  significado (por qué ese nombre y ese logo).
- Las propuestas llegan por correo; un agente con la API de Claude extraerá los datos del
  correo (texto y adjuntos) y prellenará el formulario para que el admin solo revise y guarde.
- Embudo de votación por rondas:
  1. Todas las propuestas → Top 10–15 (votan los 11 gerentes con rúbrica 1–5 por criterio)
  2. Top 10–15 → Top 5 (mecánica por definir)
  3. Top 5 → Top 3 (votan solo los 11 gerentes)
- Habrá un "modo reunión" para proyectar la galería de propuestas y resultados.
- Idioma de toda la interfaz: español (México).

## Votantes (gerentes)
- Son 11 y por ahora van fijos en el código, en un solo archivo de configuración
  (`src/config/votantes.ts`), para poder cambiarlos fácilmente después.
- No hay PIN: el gerente elige su nombre de una lista y vota. Si vuelve a votar,
  su nueva calificación reemplaza la anterior.
- Lista: Alexandra Taborda, Carlos Uribe, Daniela Tamayo, Jaime Restrepo, José Torres,
  Julián Morales, Luis Cruz, Miguel Fresnedo, Rosa Meardi, Saúl Mora, Tomás Hernández.
- Diseñar el código para que en el futuro se pueda agregar un PIN o mover la lista a una
  tabla sin rehacer la votación: el resto de la app solo accede a los votantes a través de
  las funciones exportadas por `src/config/votantes.ts` (identificados por `id` estable,
  no por nombre).

## Stack y reglas técnicas
- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.
- Supabase: Postgres, Storage (logos) y Auth (solo para admins). Usar `@supabase/ssr`.
- El MCP de Supabase está bloqueado por política de la empresa: NO usarlo. Para la base
  de datos usar siempre la CLI de Supabase (`supabase` o `npx supabase`).
- Hosting en Vercel, con el código en un repositorio privado de GitHub.
- IMPORTANTE: la versión anterior tuvo problemas de caché. Todas las páginas que muestran
  propuestas, votos o resultados deben renderizarse dinámicamente (sin caché estático):
  usar `export const dynamic = 'force-dynamic'` o fetch con `cache: 'no-store'` donde aplique.
- Nunca exponer la service role key de Supabase ni la API key de Anthropic en el cliente
  (solo en código de servidor; nunca con prefijo `NEXT_PUBLIC_`).
- Los cambios de base de datos se hacen con migraciones SQL versionadas en `/supabase/migrations`.

## Notas de versión (Next.js 16.4)
- `cacheComponents` está en `false` en `next.config.ts` a propósito, para poder usar
  `export const dynamic = 'force-dynamic'` (con Cache Components esa opción no existe).
- En Next 16 `middleware.ts` se renombró a `proxy.ts` (función `proxy`). El refresco de
  sesión de Supabase vive en `src/lib/supabase/middleware.ts` y se llama desde `src/proxy.ts`.

## Estructura clave
- `src/config/votantes.ts` — lista de gerentes votantes.
- `src/lib/supabase/server.ts` — cliente para Server Components / Route Handlers / Server Actions.
- `src/lib/supabase/client.ts` — cliente para componentes de navegador.
- `src/lib/supabase/middleware.ts` + `src/proxy.ts` — refresco de sesión de Auth.
- `src/lib/supabase/admin.ts` — cliente con service role (solo servidor, `server-only`).

## Fases
- Fase 1 (proyecto base): scaffolding, clientes Supabase, página de verificación, repo y deploy.
- Siguientes fases: tablas, formularios de captura, agente de correo, votación, modo reunión.
