@AGENTS.md

# Concurso Identidad

Aplicación web para gestionar un concurso interno de naming y logo para un proyecto de un cliente (ver regla de nombre abajo).
- Nombre del paquete: `concurso-arclad`
- Nombre visible: **Concurso Identidad** (con mayúscula en ambas palabras).

## Regla permanente de nombre y marca
- En NINGÚN lugar visible puede aparecer "ARclad", "London", "London Consulting" ni "LCG":
  títulos, pestaña del navegador, metadatos, login, encabezados, pies de página, textos,
  mensajes, modo reunión, nombres de archivos exportados (Excel, ZIP), hojas de Excel ni
  textos alternativos de imágenes.
- Excepciones que se mantienen: el dominio `concurso-arclad.vercel.app` (QR, link de votación,
  "Copiar link de votación"; decisión del usuario, no proponer cambiarlo) y los correos de los
  admins. Los nombres internos (carpeta, paquete, repo, proyecto Supabase, variables) pueden
  quedarse igual.
- Archivos exportados: "Concurso Identidad - Propuestas.xlsx", "Concurso Identidad - Logos.zip",
  "Concurso Identidad - Resultados Ronda N.xlsx", "Concurso Identidad - Paquete agencia.zip"
  (dentro: "Concurso Identidad - Ganadores.xlsx"). Content-Disposition con `adjunto()`
  (`src/lib/descarga.ts`).
- Logotipo propio: `src/components/marca/logotipo.tsx` (`<Logotipo>` wordmark en Fraunces con
  «Identidad» en itálica esmeralda + `<Simbolo>`: «i» geométrica con punto dorado). Favicon:
  `src/app/icon.svg` (mismo símbolo).

## Dos partes separadas
1. **Portal de admin (`/admin`)**: con login, solo para People & Culture. Captura, historial,
   rondas y modo reunión.
2. **Página de votación (`/votar`)**: SIN login, para los 11 gerentes. No tienen usuario ni
   contraseña ni entran al portal: reciben el link, eligen su nombre y califican.
- El link (la raíz del sitio, que redirige a `/votar`) se comparte por QR en el modo reunión,
  correo, Teams o WhatsApp: `/votar` debe funcionar igual de bien en celular y computadora.
- `/votar` nunca muestra enlaces al portal de admin, resultados, calificaciones de otros ni
  datos del autor.

## Decisiones de votación
- Votación ANÓNIMA por defecto (`MOSTRAR_AUTOR_EN_VOTACION = false` en `src/config/votacion.ts`):
  los gerentes ven folio, logo, nombre propuesto y significado; NO participante, área ni ciudad.
- Paso explícito "Enviar mi voto". Las calificaciones se guardan solas como avance
  (`calificaciones`), pero solo cuenta lo ENVIADO: al enviar se copia una "foto" a
  `calificaciones_enviadas` y se registra en `votos_enviados`. Puede corregir y volver a enviar
  mientras la ronda esté abierta; lo último enviado reemplaza lo anterior (si corrige y no
  re-envía, sigue contando lo enviado antes).
- Solo se puede enviar con TODAS las propuestas activas de la ronda calificadas en TODOS los
  criterios activos (validado en servidor, en `enviar_voto()` y en un trigger).
- Modo reunión: "votó" = envió su voto; con avance sin enviar = "(votando…)".
- Resultados (`resultados_ronda`) usan solo `calificaciones_enviadas`.

## Decisiones del concurso (Fase 7)
- Las 3 rondas se deciden por votación de los 11 gerentes con la rúbrica 1–5, con el mismo
  flujo: Ronda 1 (todas las activas → Top 15), Ronda 2 (Top 15 → Top 5), Ronda 3 (Top 5 →
  Top 3 ganadores). No hay selección manual del cliente.
- Los gerentes NUNCA ven resultados en /votar. Los resultados solo se ven en el portal de admin
  y en el modo reunión (que abre un admin).
- Cada ronda empieza en cero para cada gerente (las calificaciones son por ronda).

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

## Sistema de diseño
- Guía viva: `/admin/estilo` (logotipo, paleta, tipografía, botones, campos, etiquetas, estados).
- TODO sale de tokens en `src/app/globals.css` (ningún hex suelto en componentes; la única
  excepción documentada son los colores de los Excel en `src/lib/excel-marca.ts` y el favicon).
- Paleta: Tinta #0F1B2D (texto, fondo del modo reunión) · Esmeralda #0E7C66 (primario; hover
  #0B6553; tinte #E3F2EE) · Marfil #F7F5F0 (fondo) · Superficie #FFFFFF · Arena #E6E1D8 (bordes)
  · Pizarra #5B6472 (texto secundario) · Oro #C8A24A (ganadores; tinte #F6EFD9) · plata/bronce
  para el podio · estados éxito #15803D, advertencia #B45309, error #B42318.
  Tokens Tailwind: primary, primary-hover, accent, tinta, oro, oro-suave, oro-foreground, plata,
  bronce, exito(-fondo), advertencia(-fondo/-foreground), destructive(-fondo), lienzo-logo…
- Tema oscuro: clase `.tema-oscuro` (redefine los mismos tokens: fondo tinta, superficies
  #16243A, texto marfil). Se usa en el modo reunión (por defecto), el panel del login y la
  bienvenida de /votar. El lienzo del logo se mantiene claro en ambos temas.
- Tipografía (next/font): títulos Fraunces 500–700 (`font-heading`, tracking negativo en
  grandes); texto/botones/formularios Manrope; números con la utilidad `cifras` (tabulares).
  Escala: 12/14/16/20/24/32/44/60 (text-xs … text-6xl; text-3xl=32, text-4xl=44).
- Forma: radios 10 px controles (rounded-lg), 16 px tarjetas (rounded-xl), 24 px paneles
  (rounded-2xl). Sombras suaves en capas: shadow-xs/sm/md/lg. Bordes finos en arena.
- Movimiento: transiciones 150–250 ms; utilidad `aparecer` con `--i` para entradas escalonadas;
  `animate-revelar` (modo reunión / ganadores); todo se desactiva con prefers-reduced-motion.
- Piezas comunes: `EncabezadoPagina` y `Metrica` (`src/components/admin/encabezado-pagina.tsx`),
  `Embudo` (Todas → Top 15 → Top 5 → Top 3), `EstadoVacio` (ilustración SVG propia),
  `PatronGeometrico`, `Skeleton` (esqueletos en lugar de spinners), Badge con variantes tipo pill
  (exito, destructive, advertencia, oro, solido, outline), Button con variantes tinta y oro.
- Responsive: sin scroll horizontal a 360, 820 y 1440 px (encabezado del panel: textos de
  acciones solo en 2xl; navegación en segunda fila debajo de lg).
- Conservar los `data-testid` y textos que usan las pruebas E2E al cambiar estilos.
- Tarjeta de propuesta reutilizable: `src/components/propuestas/tarjeta-propuesta.tsx`.

## Votantes (gerentes y, en la Ronda 3, todo el personal)
- Rondas 1 y 2: votan los 11 gerentes. Ronda 3: votan 157 personas = los 11 gerentes + 146 personas
  del «Listado Participantes Concurso Logo.xlsx» (`src/config/personal-ronda-3.ts`; los 7 gerentes que
  también vienen en el listado votan con su id de gerente).
- Las listas por ronda viven en `VOTANTES_POR_RONDA` (`src/config/votantes.ts`). `obtenerVotantes(n)`,
  `obtenerVotante(id, n)`, `totalVotantes(n)` y `etiquetaVotantes(n)` reciben el número de ronda; sin número
  usan los gerentes. El votante se valida contra la lista de la ronda abierta. En /votar hay buscador
  de nombre cuando la lista es larga.
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

## Modo reunión (Fase 5)
- `/admin/reunion` (fuera del layout del panel, pantalla completa; protegido con proxy +
  `exigirAdmin()`). Datos en `src/lib/datos/reunion.ts`: SOLO folio, nombre, significado,
  logo y autor; nunca notas internas, estado ni quién capturó.
- Galería (todas las activas o una ronda), orden por folio o aleatorio (fijo por sesión en
  sessionStorage), detalle con ←/→, A (autor, oculto por defecto), F (pantalla completa), Esc.
- Controles que se ocultan a los 3 s; tema oscuro con la clase `.tema-oscuro` (mismos tokens;
  el lienzo del logo sigue claro).
- URLs firmadas (60 min) se renuevan solas a los 50 min y si una imagen falla.
- Panel de votación: QR + link a `/votar` y avance en vivo (polling 4 s) sin calificaciones;
  "votó" = calificó todas las propuestas activas de la ronda en todos los criterios activos.
- `/votar` es un marcador público hasta la Fase 6.

## Votación y rondas (Fase 6)
- `/` redirige a `/votar`. "Copiar link de votación" (encabezado del panel y `/admin/rondas`)
  copia la raíz del sitio (`src/lib/link-votacion.ts`); el QR del modo reunión apunta ahí.
- `/votar` (`src/components/votar/votacion.tsx`): elegir nombre (se recuerda en el dispositivo),
  una propuesta por pantalla, orden aleatorio estable por gerente y ronda, guardado automático
  con cola de reintentos persistida en localStorage, retoma en otro dispositivo (primera
  pendiente), revisar/enviar, corregir. Acciones públicas en `src/app/votar/acciones.ts` →
  `src/lib/datos/votacion.ts` (service role; solo devuelve lo necesario).
- `/admin/rondas` y `/admin/rondas/[id]`: abrir/cerrar/reabrir con confirmación, agregar todas
  las activas (ronda 1) o individuales. Reglas en la base: propuestas de una ronda solo cambian
  en `pendiente`; no se abre una ronda sin propuestas; una sola abierta.
- "Conexión OK" vive ahora en `/admin/mantenimiento` (Estado del sistema).

## Resultados, avance y ganadores (Fase 7)
- `/admin/rondas/[id]/resultados`: ranking (votos enviados), línea de corte en top_n, aviso de
  empate en el corte (`src/lib/corte.ts`), detalle por gerente (diálogo), en vivo si la ronda
  está abierta (router.refresh cada 10 s), Excel con hojas «Ranking» y «Detalle por gerente».
- `/admin/rondas/[id]/avanzar`: preselecciona el Top N (incluye empatadas), el admin ajusta y
  confirma → `pasar_a_siguiente_ronda()` (guarda posicion_final = posición del ranking, agrega a
  la siguiente ronda, registra en `avances_ronda`). `deshacer_avance()` solo si la siguiente
  sigue pendiente y sin votos. Una ronda que ya avanzó no se puede reabrir.
- `/admin/ganadores`: el admin confirma 1º/2º/3º (`confirmar_ganadores()`, resuelve empates;
  posicion_final 1–3 en la ronda final + `ganadores_confirmados`). Paquete para la agencia: ZIP
  armado en el navegador con logos originales ("1 - Nombre.png") + Excel generado en servidor.
  Reabrir la ronda final anula la confirmación.
- Modo reunión: vista «Resultados» (rondas cerradas; sin calificaciones por gerente ni autor;
  promedios ocultos por defecto) y «Revelar ganadores» (3º → 2º → 1º → podio, con autor).
- Pruebas E2E (fuera del repo): la limpieza SOLO corre si la prueba pasó sus precondiciones;
  nunca borrar datos de la base si la prueba se canceló.

## Fases
- Fase 1 (proyecto base): scaffolding, clientes Supabase, página de verificación, repo y deploy.
- Fase 2 (base de datos): migraciones, RLS, Storage, tipos y capa de datos. ✅
- Fase 3 (login y captura): login de admins, panel, formulario de captura rápida. ✅
- Fase 4 (gestión): lista, detalle, edición, descartar/restaurar, exportar, mantenimiento. ✅
- Fase 5 (modo reunión): galería, detalle, presentación y panel de votación. ✅
- Fase 6 (votación): /votar para gerentes, envío explícito, gestión de rondas. ✅
- Fase 7 (resultados y cierre): ranking, avance entre rondas, ganadores, revelación. ✅
- Fase de diseño: rediseño visual completo, marca «Concurso Identidad», guía /admin/estilo. ✅
- Manuales (docs/manual): administrador y guía para votar, HTML fuente + PDF; ver docs/manual/LEEME.md. ✅
