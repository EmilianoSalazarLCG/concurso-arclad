@AGENTS.md

# Concurso identidad

Aplicación web para gestionar un concurso interno de naming y logo para un proyecto de un cliente (ver regla de nombre abajo).
- Nombre del paquete: `concurso-arclad`
- Nombre visible: **Concurso identidad**
- REGLA: nada de lo que se ve en la aplicación (textos, títulos de pestaña, encabezados,
  nombres de archivos exportados, metadatos) puede mencionar "ARclad" ni "London Consulting".
  El nombre de la carpeta, del paquete, del repo y del proyecto Supabase son internos.

## Contexto del proyecto
- Concurso donde colaboradores proponen nombre + logo para un proyecto.
- Los ADMINISTRADORES (equipo de People & Culture) capturan las propuestas; los
  participantes no entran a la app.
- Cada propuesta: nombre de la persona, área, ciudad, nombre propuesto, logo (PNG/JPG),
  significado (por qué ese nombre y ese logo).
- La captura de propuestas es MANUAL (no hay agente de correo ni integración con la API de
  Claude/Anthropic). Debe ser rápida para el admin:
  - pegar el logo con Cmd+V (portapapeles) o arrastrar el archivo al formulario;
  - autocompletar área y ciudad con los valores ya capturados;
  - botón "Guardar y capturar otra" (limpia el formulario y conserva el foco);
  - vista previa de la propuesta (incluido el logo) antes de guardar;
  - aviso de posibles duplicados (mismo participante y/o nombre propuesto similar).
- Embudo de votación por rondas:
  1. Todas las propuestas → Top 10–15 (votan los 11 gerentes con rúbrica 1–5 por criterio)
  2. Top 10–15 → Top 5 (mecánica por definir)
  3. Top 5 → Top 3 (votan solo los 11 gerentes)
- Habrá un "modo reunión" para proyectar la galería de propuestas y resultados.
- Idioma de toda la interfaz: español (México).

## Decisión de acceso
- SOLO los admins (con login) ven el historial completo de propuestas, incluidas las
  descartadas, las notas internas y quién capturó cada una.
- Los gerentes NO tienen acceso al historial: solo ven las propuestas de la ronda que se
  está votando, sin notas internas (`propuestasParaVotar()` en `src/lib/datos/rondas.ts`).
- El modo reunión lo abre un admin desde su sesión y lo proyecta en pantalla (es una ruta
  dentro de `/admin`, protegida igual que el resto del panel).

## Estilo visual
- Limpio y profesional: títulos con serif (Source Serif 4, `font-heading`), texto con
  sans-serif (Inter), fondo claro, acento verde, tarjetas con bordes suaves.
- Todos los colores, radios y fuentes son variables en `:root` de `src/app/globals.css`
  (tokens de Tailwind: `primary`, `accent`, `advertencia`, `lienzo-logo`, etc.). Para
  adaptar a la marca del cliente se cambian ahí; los componentes no usan colores fijos.
- Solo tema claro. Responsive (la captura se hace principalmente en computadora).
- Tarjeta de propuesta reutilizable: `src/components/propuestas/tarjeta-propuesta.tsx`
  (vista previa, galería y modo reunión).

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
- Nunca exponer la service role key de Supabase en el cliente
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

## Base de datos (Fase 2)
- Proyecto Supabase: "Concurso Identidad ARclad" (ref `bguuokdhkclheplgxjnk`), vinculado con
  `supabase link`. Con CLI 3.x los comandos remotos llevan `--remote`
  (`supabase db push --remote`, `supabase gen types typescript --linked > src/types/database.ts`).
- Tablas: `admins`, `propuestas`, `criterios`, `rondas`, `ronda_propuestas`, `calificaciones`;
  vista `resultados_ronda`; funciones `es_admin()` y `buscar_posibles_duplicados()`.
- Reglas en la base: una sola ronda `abierta` a la vez; las propuestas no se borran, se
  descartan (`estado`); solo se califica una propuesta que pertenece a la ronda, en ronda
  abierta y con criterio activo; puntaje 1–5; re-votar = upsert.
- RLS en todas las tablas. `anon` no tiene ningún acceso. Usuarios autenticados solo si
  están en `admins`. Los votos se escriben únicamente desde el servidor con service role.
- Storage: bucket privado `logos` (PNG/JPG, 5 MB), archivos con nombre uuid, se muestran
  con URLs firmadas generadas en el servidor (el nombre del proyecto es confidencial).
- Tras cada migración: regenerar `src/types/database.ts`.

## Acceso a datos (`src/lib/datos/`, solo servidor)
- `auth.ts` — `obtenerAdminActual()`, `requerirAdmin()` (llamar al inicio de toda acción de admin).
- `propuestas.ts` — alta/edición/descartar, duplicados, autocompletar área y ciudad.
- `logos.ts` — validación (tamaño, tipo y firma real del archivo), subida, URLs firmadas.
- `rondas.ts` — abrir/cerrar, propuestas por ronda, posición final; lecturas para votación
  sin `notas_internas`.
- `votos.ts` — `registrarCalificaciones()` con todas las validaciones (service role).
- `resultados.ts` — ranking (`resultados_ronda`) y avance de votación por gerente.
- Las funciones de admin usan la sesión del usuario (RLS aplica). Las de votación/modo
  reunión usan service role y nunca devuelven `notas_internas`.

## Panel de admin (Fase 3)
- Rutas: `/admin/login` (pública), `/admin/salir` (cierra sesión sin acceso), y el grupo
  `src/app/admin/(panel)/` (layout protegido): `/admin`, `/admin/propuestas`,
  `/admin/propuestas/nueva`.
- Protección en 3 capas: `src/proxy.ts` (sin sesión → login), `exigirAdmin()` en layout y
  en cada página (no admin → cierra sesión y "No tienes acceso"), y `requerirAdmin()` en
  cada Server Action / función de datos. Además, RLS en la base.
- Subida de logos: el navegador sube DIRECTO a Storage con una URL de subida firmada que
  genera el servidor (`prepararSubidaLogo`), porque Vercel limita el cuerpo de las
  funciones a 4.5 MB. Luego `guardarPropuesta` descarga y valida el archivo (tamaño y
  firma PNG/JPG) antes de insertar; si algo falla, borra el logo.
- Validación compartida cliente/servidor: `src/lib/validacion/propuesta.ts`.
- Área y ciudad se unifican sin acentos/mayúsculas con los valores existentes (cliente y
  servidor).
- `reiniciar_folio_si_vacio()` (solo service role) deja el folio en 001 tras pruebas.

## Gestión de propuestas (Fase 4)
- `/admin/propuestas`: tabla/tarjetas (la vista se recuerda por admin en una cookie),
  búsqueda sin acentos (folio, nombre, participante), filtros área/ciudad/estado
  (por defecto activas), orden, contadores y paginación de 24. Los filtros viven en la
  URL (`src/lib/validacion/filtros.ts`).
- Vista `propuestas_admin` (security_invoker): nombres de quién capturó/editó/descartó y
  columnas normalizadas `busqueda` / `nombre_orden`. Capa de datos: `src/lib/datos/gestion.ts`.
  OJO: no envolver un query builder de Supabase en una función `async` (es "thenable" y se
  ejecuta al hacer await); armarlo de forma síncrona.
- Detalle `/admin/propuestas/[id]` (anterior/siguiente por folio, descarga del original vía
  URL firmada) y edición `/admin/propuestas/[id]/editar` (mismo formulario, `inicial`).
- Trigger `propuestas_auditoria`: `updated_by/updated_at` solo cambian si cambia el contenido;
  registra `descartada_por/at` y `motivo_descarte`; impide descartar si la propuesta está en
  una ronda abierta o cerrada; protege folio/created_by/created_at.
- Exportar: Excel en el servidor (`/admin/propuestas/exportar`, exceljs); ZIP de logos armado
  en el NAVEGADOR (fflate) con URLs firmadas, por el límite de 4.5 MB de respuesta de Vercel.
- `/admin/mantenimiento`: limpieza de logos huérfanos con más de 24 h
  (`src/lib/datos/huerfanos.ts`), con confirmación; recalcula antes de borrar.
- `ajustar_folio()` (solo service role): deja el consecutivo en (folio más alto + 1) tras
  borrar propuestas de prueba.

## Fases
- Fase 1 (proyecto base): scaffolding, clientes Supabase, página de verificación, repo y deploy.
- Fase 2 (base de datos): migraciones, RLS, Storage, tipos y capa de datos. ✅
- Fase 3 (login y captura): login de admins, panel, formulario de captura rápida. ✅
- Fase 4 (gestión): lista, detalle, edición, descartar/restaurar, exportar, mantenimiento. ✅
- Siguientes fases: votación por rondas, modo reunión.
