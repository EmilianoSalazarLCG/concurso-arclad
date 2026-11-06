"""Genera los HTML de los manuales en docs/manual (fuente editable de los PDF)."""
import json, sys, html
from pathlib import Path

D = Path(sys.argv[1])
M = json.loads((D / "capturas" / "marcadores.json").read_text())

FUENTES = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500..700;1,9..144,500..600&family=Manrope:wght@400;500;600;700&display=swap">'
SIMBOLO = ('<svg width="{s}" height="{s}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#0E7C66"/>'
           '<path d="M11 13.5h5.5V25" fill="none" stroke="#F7F5F0" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>'
           '<circle cx="21.5" cy="9" r="3.2" fill="#C8A24A"/></svg>')
PATRON = ('<svg class="patron" width="100%" height="100%" aria-hidden="true"><defs><pattern id="p" width="96" height="96" patternUnits="userSpaceOnUse">'
          '<rect x="12" y="12" width="26" height="26" rx="8" fill="none" stroke="currentColor" stroke-width="1"/>'
          '<circle cx="72" cy="25" r="5" fill="currentColor"/><path d="M60 68h14v16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
          '<circle cx="25" cy="74" r="12" fill="none" stroke="currentColor" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>')


def logo(s=34):
    return f'<span class="logo">{SIMBOLO.format(s=s)}<span>Concurso <em>Identidad</em></span></span>'


def captura(nombre, pie=None, cel=False, marcas=True):
    def clase(m):
        c = ["marca"]
        if m["y"] < 7: c.append("abajo")
        if m["x"] < 5: c.append("derecha")
        return " ".join(c)
    ms = "".join(f'<span class="{clase(m)}" style="left:{m["x"]}%;top:{m["y"]}%">{m["n"]}</span>' for m in (M.get(nombre, []) if marcas else []))
    fig = f'<div class="marco"><img src="capturas/{nombre}.jpg" alt="">{ms}</div>'
    return f'<figure class="captura{" cel" if cel else ""}">{fig}{f"<figcaption>{pie}</figcaption>" if pie else ""}</figure>'


def acciones(items):
    li = []
    for it in items:
        if isinstance(it, tuple):
            n, t = it
            li.append(f'<li class="num"><span class="n">{n}</span><span>{t}</span></li>')
        else:
            li.append(f"<li><span>{it}</span></li>")
    return f'<ul class="acciones">{"".join(li)}</ul>'


def pagina(doc_titulo, cuerpo):
    return f"""<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<title>{doc_titulo}</title>
{FUENTES}
<link rel="stylesheet" href="estilos.css">
</head>
<body>
{cuerpo}
</body>
</html>
"""


# ============================================================ Manual del administrador
SECCIONES = []  # (titulo, descripcion, html)


def hoja(ante, titulo, lead, contenido, indice=None):
    SECCIONES.append((titulo, indice or ""))
    return f"""
<section class="hoja">
  <p class="ante">{ante}</p>
  <h2>{titulo}</h2>
  <p class="lead">{lead}</p>
  <div class="cuerpo">{contenido}</div>
</section>"""


h = []
h.append(hoja(
    "Antes de empezar", "Cómo funciona el concurso",
    "Los colaboradores proponen un nombre y un logo. People &amp; Culture captura las propuestas y los 11 gerentes votan en tres rondas hasta elegir a los 3 ganadores.",
    """
<div class="embudo">
  <div class="etapa"><p class="k">Todas</p><p class="cifra">N</p><p class="q">Propuestas activas capturadas por P&amp;C</p></div>
  <div class="etapa"><p class="k">Ronda 1</p><p class="cifra">15</p><p class="q">Pasan las mejores 15</p></div>
  <div class="etapa"><p class="k">Ronda 2</p><p class="cifra">5</p><p class="q">Pasan las mejores 5</p></div>
  <div class="etapa"><p class="k">Ronda 3</p><p class="cifra">3</p><p class="q">Ganadores: 1º, 2º y 3º</p></div>
</div>
<table class="tabla">
  <thead><tr><th>Etapa</th><th>Quién vota</th><th>Qué hace el admin</th></tr></thead>
  <tbody>
    <tr><td>Captura</td><td>Nadie</td><td>Captura cada propuesta que llega por correo, revisa duplicados y descarta las que no apliquen.</td></tr>
    <tr><td>Ronda 1</td><td>Los 11 gerentes</td><td>Agrega todas las propuestas activas, abre la votación, comparte el link y la cierra cuando todos enviaron.</td></tr>
    <tr><td>Ronda 2</td><td>Los 11 gerentes</td><td>Revisa resultados, resuelve empates en el corte y pasa el Top 15; abre, comparte y cierra.</td></tr>
    <tr><td>Ronda 3</td><td>Los 11 gerentes</td><td>Pasa el Top 5; al cerrar, confirma a los 3 ganadores y descarga el paquete para la agencia.</td></tr>
    <tr><td>Reunión</td><td>—</td><td>Proyecta la galería, el avance de la votación, los resultados y la revelación de ganadores.</td></tr>
  </tbody>
</table>
<div class="dos">
  <div class="nota"><b>Cómo votan.</b> Cada gerente califica cada propuesta del 1 al 5 en cuatro criterios y presiona «Enviar mi voto». Solo cuentan los votos enviados.</div>
  <div class="nota"><b>Anónimo.</b> Los gerentes no ven quién propuso cada nombre ni los resultados. Las calificaciones individuales solo se ven en este portal.</div>
</div>
<div class="nota oro"><b>Dos accesos distintos.</b> El portal de admin (<b>/admin</b>, con usuario y contraseña) es solo para People &amp; Culture. Los gerentes no tienen usuario: votan desde el link <b>concurso-arclad.vercel.app</b>.</div>
""", "El embudo y quién hace qué"))

h.append(hoja(
    "Portal de admin · /admin/login", "Iniciar sesión",
    "Entrada al portal de People &amp; Culture. Solo pueden entrar los usuarios dados de alta como administradores.",
    captura("admin-01-login") + acciones([
        "Escribe tu correo y tu contraseña y presiona <b>Iniciar sesión</b>.",
        "Si aparece «No tienes acceso», tu usuario no está dado de alta como admin: pide que te agreguen.",
        "Para salir, usa el ícono de <b>Cerrar sesión</b> en la esquina superior derecha.",
    ]), "Acceso al portal"))

h.append(hoja(
    "Portal de admin · /admin", "Panel de inicio",
    "Vista general del concurso: cuántas propuestas hay, qué ronda está en curso y cuántos gerentes ya enviaron su voto.",
    captura("admin-02-inicio") + acciones([
        (1, "<b>Propuestas activas</b>: las que participarán en la Ronda 1 (las descartadas no cuentan)."),
        (2, "<b>Embudo del concurso</b>: el estado de cada ronda (pendiente, votando o cerrada)."),
        (3, "<b>Copiar link de votación</b>: copia el link para pegarlo en correo, Teams o WhatsApp."),
        "Los accesos rápidos llevan a captura, propuestas, rondas, modo reunión y ganadores.",
    ]), "Métricas, embudo y accesos"))

h.append(hoja(
    "Portal de admin · Capturar propuesta", "Capturar propuesta",
    "Registra cada propuesta que llega por correo. Todos los campos son obligatorios excepto las notas internas.",
    captura("admin-03-capturar") + acciones([
        (1, "<b>Logo</b>: pégalo con ⌘V (o Ctrl+V) desde el correo, arrástralo o haz clic para elegirlo. PNG o JPG de hasta 5 MB."),
        (2, "<b>Vista previa</b>: así se verá la propuesta en la galería y en la votación."),
        "<b>Guardar y capturar otra</b> (⇧⌘↵) limpia el formulario para seguir; <b>Guardar</b> (⌘↵) te lleva a la lista.",
        "Área y ciudad se autocompletan; si escribes un nombre parecido a otro ya capturado, verás un aviso de posible duplicado.",
    ]), "Formulario y logo"))

h.append(hoja(
    "Portal de admin · /admin/propuestas", "Lista de propuestas",
    "El historial completo, solo para admins: incluye las descartadas, las notas internas y quién capturó cada propuesta.",
    captura("admin-04-lista-tabla") + f'<div class="dos-a">{captura("admin-05-lista-tarjetas", "Vista en tarjetas, tipo galería.")}' + acciones([
        (1, "<b>Busca</b> por folio, nombre o participante y filtra por estado, área o ciudad."),
        (2, "<b>Exportar a Excel</b> y <b>Descargar logos</b> respetan los filtros que tengas."),
        (3, "Cambia entre <b>Tabla</b> y <b>Tarjetas</b>; la app recuerda tu elección."),
        "Haz clic en una fila para abrir el detalle.",
    ]) + "</div>", "Buscar, filtrar y exportar"))

h.append(hoja(
    "Portal de admin · Detalle", "Detalle de una propuesta",
    "Todos los datos de la propuesta, el logo en grande y su historial: quién la capturó, quién la editó y en qué rondas participa.",
    captura("admin-06-detalle") + f'<div class="dos-a">{captura("admin-07-descartar", "Descartar pide confirmación y un motivo opcional.")}' + acciones([
        (1, "<b>Editar</b>: corrige datos o reemplaza el logo. El folio nunca cambia."),
        (2, "<b>Descartar</b>: la propuesta sale del concurso, pero se conserva con su etiqueta. «Restaurar» la regresa."),
        (3, "Usa <b>Anterior / Siguiente</b> para revisar por folio."),
        "No se puede descartar una propuesta que ya está en una ronda abierta o cerrada.",
    ]) + "</div>", "Editar, descartar y restaurar"))

h.append(hoja(
    "Portal de admin · /admin/rondas", "Rondas",
    "Aquí se abre y se cierra cada votación. Solo puede haber una ronda abierta a la vez.",
    captura("admin-08-rondas") + acciones([
        (1, "El <b>embudo</b> muestra en qué etapa va el concurso."),
        (2, "<b>Abrir votación</b> / <b>Cerrar votación</b>, siempre con confirmación. Una ronda sin propuestas no se puede abrir."),
        (3, "<b>Copiar link de votación</b> para compartirlo con los gerentes."),
        "En <b>Propuestas</b> de la Ronda 1 usa «Agregar todas las propuestas activas» antes de abrirla.",
        "<b>Reabrir</b> una ronda cerrada permite que los gerentes cambien su voto: úsalo solo si es necesario.",
    ]), "Abrir, cerrar y compartir el link"))

h.append(hoja(
    "Portal de admin · Resultados", "Resultados de una ronda",
    "Ranking con el promedio de cada propuesta. Durante la votación se actualiza solo; solo cuentan los votos enviados.",
    captura("admin-09-resultados") + acciones([
        (1, "Si hay <b>empate en el lugar de corte</b>, la app lo avisa para que decidas cuál pasa."),
        (2, "La <b>línea de corte</b> separa las propuestas que pasan a la siguiente ronda."),
        (3, "Con la ronda cerrada, <b>Pasar a la Ronda N</b> lleva a la selección final."),
        "Haz clic en una propuesta para ver la calificación de cada gerente; <b>Exportar a Excel</b> descarga ranking y detalle.",
    ]), "Ranking, corte y empates"))

h.append(hoja(
    "Portal de admin · Pasar a la siguiente ronda", "Pasar a la siguiente ronda",
    "Viene preseleccionado el Top N según el ranking. Ajusta la selección si hay empate y confirma.",
    captura("admin-10-avanzar") + f'<div class="dos-a">{captura("admin-11-avanzar-confirmar", "Resumen antes de confirmar.")}' + acciones([
        (1, "El aviso de <b>empate</b> marca las propuestas empatadas."),
        (2, "El contador indica si sobran o faltan propuestas respecto al Top N."),
        (3, "<b>Revisar y confirmar</b> muestra el resumen; al confirmar, la siguiente ronda queda lista para abrirse."),
        "Mientras la siguiente ronda no se abra, puedes <b>Deshacer avance</b> desde los resultados.",
    ]) + "</div>", "Selección del Top N"))

h.append(hoja(
    "Portal de admin · /admin/ganadores", "Ganadores",
    "Al cerrar la Ronda 3 aparecen los 3 ganadores con su logo, significado y autor.",
    captura("admin-12-ganadores") + acciones([
        (1, "El <b>1er lugar</b> va al centro, con oro; 2º y 3º con plata y bronce."),
        (2, "<b>Paquete para la agencia</b>: ZIP con los logos originales y un Excel con nombre, significado y autor."),
        "Si hay empate entre lugares, primero elige el orden final y presiona <b>Confirmar ganadores</b>.",
        "«Cambiar el orden de los ganadores» permite corregir la confirmación.",
    ]), "Top 3 y paquete para la agencia"))

h.append(hoja(
    "Modo reunión · /admin/reunion", "Modo reunión: galería",
    "Pantalla para proyectar en la reunión. Ábrela desde «Modo reunión» en el encabezado; presiona F para pantalla completa.",
    captura("admin-13-reunion-galeria") + f'<div class="dos-a">{captura("admin-14-reunion-propuesta", "Una propuesta en grande; el autor está oculto.", marcas=False)}' + acciones([
        (1, "Elige qué mostrar: todas las propuestas activas o las de una ronda; orden por folio o aleatorio."),
        (2, "<b>Votación</b> muestra el QR y el avance (solo si hay una ronda abierta)."),
        "En una propuesta: ← → para navegar, <b>A</b> para mostrar u ocultar el autor y Esc para volver.",
        "Los controles se ocultan solos; el botón de luna o sol cambia entre tema oscuro y claro.",
    ]) + "</div>", "Proyectar propuestas"))

h.append(hoja(
    "Modo reunión · Votación", "Modo reunión: votación en vivo",
    "Muestra el QR para que los gerentes voten desde su celular y el avance en tiempo real, sin calificaciones.",
    captura("admin-15-reunion-votacion") + acciones([
        (1, "El <b>QR</b> y el link corto llevan directo a la página de votación."),
        (2, "<b>«6 de 11 gerentes han votado»</b> se actualiza solo cada pocos segundos."),
        "«Ya votaron» lista a quien envió su voto; «Faltan» incluye a quien va a medias (votando…).",
        "Nunca se muestran calificaciones individuales.",
    ]), "QR y avance"))

h.append(hoja(
    "Modo reunión · Resultados", "Modo reunión: resultados",
    "Proyecta el ranking de una ronda cerrada, resaltando las propuestas que pasan. No muestra calificaciones por gerente ni autores.",
    captura("admin-16-reunion-resultados") + acciones([
        (1, "Elige la ronda cerrada que quieres mostrar."),
        (2, "<b>Mostrar promedios</b> enciende o apaga los números (por defecto están ocultos)."),
        "En la ronda final, los lugares 1, 2 y 3 aparecen en oro, plata y bronce.",
    ]), "Ranking para proyectar"))

h.append(hoja(
    "Modo reunión · Revelar ganadores", "Modo reunión: revelar ganadores",
    "El momento final. Se habilita cuando los ganadores están confirmados. Avanza con → o un clic; ← regresa.",
    captura("admin-18-revelar-primer-lugar") + '<div class="dos">' + captura("admin-17-revelar-portada", "Portada.") + captura("admin-19-revelar-podio", "Podio final.") + "</div>"
    + acciones([
        "Orden de la revelación: portada → 3er lugar → 2º lugar → 1er lugar → podio.",
        "El autor (participante, área y ciudad) aparece al revelar cada lugar.",
    ]), "3er, 2º y 1er lugar"))

h.append(hoja(
    "Checklist", "Lista rápida para el día de la votación",
    "Úsala en cada ronda. Marca cada paso conforme avances.",
    """
<div class="lista3">
  <div class="bloque"><p class="cuando">Antes</p><h3>Preparar</h3><ul class="check">
    <li>Todas las propuestas capturadas y revisadas (sin duplicados).</li>
    <li>Las que no participan, descartadas.</li>
    <li>Ronda 1: «Agregar todas las propuestas activas».</li>
    <li>Probar el link de votación en tu celular.</li>
    <li>Proyector listo: modo reunión, tema y pantalla completa (F).</li>
  </ul></div>
  <div class="bloque"><p class="cuando">Durante</p><h3>Votar</h3><ul class="check">
    <li>Rondas → <b>Abrir votación</b>.</li>
    <li>Compartir el QR (modo reunión → Votación) o «Copiar link de votación».</li>
    <li>Seguir el avance «x de 11».</li>
    <li>Recordar a quien aparece en «Faltan» o «votando…».</li>
    <li>Cuando los 11 enviaron: <b>Cerrar votación</b>.</li>
  </ul></div>
  <div class="bloque"><p class="cuando">Después</p><h3>Cerrar</h3><ul class="check">
    <li>Revisar resultados y resolver empates en el corte.</li>
    <li><b>Exportar a Excel</b> como respaldo.</li>
    <li><b>Pasar a la siguiente ronda</b> (Top 15 → Top 5).</li>
    <li>Al final: <b>Confirmar ganadores</b> y descargar el paquete para la agencia.</li>
    <li>En la reunión: <b>Revelar ganadores</b>.</li>
  </ul></div>
</div>
<div class="nota" style="margin-top:6px"><b>Link de votación:</b> concurso-arclad.vercel.app · <b>Portal:</b> concurso-arclad.vercel.app/admin</div>
""", "Antes, durante y después"))

# Índice: portada (1) + índice (2) + una página por sección.
filas = []
grupos = {0: "Introducción", 1: "Portal de admin", 10: "Modo reunión", 14: "Cierre"}
for i, (t, d) in enumerate(SECCIONES):
    if i in grupos:
        filas.append(f'<li class="grupo">{grupos[i]}</li>')
    filas.append(f'<li><span class="t">{t}</span><span class="d">{d}</span><span class="relleno"></span><span class="p">{i + 3}</span></li>')

portada_admin = f"""
<section class="portada">
  {PATRON}<div class="halo"></div>
  <div>{logo(38)}</div>
  <div>
    <p class="ante">People &amp; Culture · Manual de uso</p>
    <h1>Manual del <em>administrador</em></h1>
    <p class="bajada">Cómo capturar propuestas, guiar las tres rondas de votación de los gerentes y revelar a los ganadores.</p>
  </div>
  <div class="datos"><div><b>Portal</b>concurso-arclad.vercel.app/admin</div><div><b>Votación</b>concurso-arclad.vercel.app</div><div><b>Versión</b>Noviembre 2026</div></div>
</section>
<section class="hoja">
  <p class="ante">Contenido</p>
  <h2>Índice</h2>
  <ul class="indice">{''.join(filas)}</ul>
</section>
"""
(D / "manual-administrador.html").write_text(pagina("Manual del administrador – Concurso Identidad", portada_admin + "".join(h)))

# ============================================================ Guía para votar
def paso(n, titulo, texto, img):
    return f'<div class="paso"><div class="cab"><span class="num">{n}</span><div><h3>{titulo}</h3><p>{texto}</p></div></div>{captura(img, cel=True, marcas=False)}</div>'


guia = f"""
<section class="portada">
  {PATRON}<div class="halo"></div>
  <div>{logo(38)}</div>
  <div>
    <p class="ante">Para los 11 gerentes</p>
    <h1>Guía para <em>votar</em></h1>
    <p class="bajada">Califica las propuestas del 1 al 5 en cuatro criterios y envía tu voto. Toma unos minutos, desde tu celular o tu computadora.</p>
    <p class="link" style="background:rgba(47,181,150,.15);color:#7fe0c8">concurso-arclad.vercel.app</p>
  </div>
  <div class="datos"><div><b>Sin usuario ni contraseña</b>Solo eliges tu nombre</div><div><b>Anónimo</b>No verás quién propuso cada nombre</div><div><b>Versión</b>Noviembre 2026</div></div>
</section>

<section class="hoja">
  <p class="ante">Paso a paso · 1 de 2</p>
  <h2>Cómo votar</h2>
  <div class="pasos">
    {paso(1, "Abre el link y elige tu nombre", "Entra a <b class='dominio'>concurso-arclad.vercel.app</b> o escanea el QR de la reunión. Toca tu nombre en la lista.", "votar-01-elegir-nombre")}
    {paso(2, "Califica cada criterio", "Toca un número del 1 al 5 en cada uno de los 4 criterios. Se guarda solo («Guardado»).", "votar-03-calificar")}
    {paso(3, "Revisa tu avance", "La barra muestra cuántas calificaciones llevas. «Índice» te deja saltar a cualquier propuesta.", "votar-04-indice")}
  </div>
</section>

<section class="hoja">
  <p class="ante">Paso a paso · 2 de 2</p>
  <h2>Enviar y corregir</h2>
  <div class="pasos">
    {paso(4, "Completa lo que falte", "Si algo quedó sin calificar, la app te dice qué propuesta falta y te lleva a ella.", "votar-05-faltantes")}
    {paso(5, "Envía tu voto", "Cuando todo está calificado, toca <b>Enviar mi voto</b>. Verás la confirmación.", "votar-07-gracias")}
    {paso(6, "Corrige si lo necesitas", "Mientras la votación esté abierta: «Corregir mis calificaciones», cambia y vuelve a enviar.", "votar-09-corregir")}
  </div>
</section>

<section class="hoja">
  <p class="ante">Referencia</p>
  <h2>Escala, criterios y preguntas</h2>
  <div class="seccion"><h3>La escala</h3>
    <div class="escala"><div><b>1</b><span>No cumple</span></div><div><b>2</b><span>Cumple poco</span></div><div><b>3</b><span>Cumple en parte</span></div><div><b>4</b><span>Cumple</span></div><div><b>5</b><span>Cumple mucho</span></div></div>
  </div>
  <div class="seccion"><h3>Los 4 criterios</h3>
    <div class="criterios">
      <div><b>Alineación con la visión</b><span>¿Qué tan bien refleja el nombre y el logo la visión del proyecto?</span></div>
      <div><b>Creatividad</b><span>¿Es una propuesta original y memorable?</span></div>
      <div><b>Impacto visual</b><span>¿El logo es atractivo, claro y funciona visualmente?</span></div>
      <div><b>Claridad del mensaje</b><span>¿Se entiende fácilmente lo que el nombre y el logo comunican?</span></div>
    </div>
  </div>
  <div class="seccion"><h3>Preguntas frecuentes</h3>
    <div class="faq">
      <div><h3>¿Se guarda si cierro el navegador?</h3><p>Sí. Cada calificación se guarda al tocarla. Vuelve al link, elige tu nombre y sigues donde ibas, incluso en otro dispositivo.</p></div>
      <div><h3>¿Puedo cambiar mi voto?</h3><p>Sí, mientras la votación esté abierta. Corrige y vuelve a tocar «Enviar mi voto»; cuenta lo último que enviaste.</p></div>
      <div><h3>¿Puedo votar desde la computadora?</h3><p>Sí, con el mismo link. En pantalla grande verás el logo y los criterios lado a lado.</p></div>
      <div><h3>¿Quién ve mis calificaciones?</h3><p>Solo el equipo de People &amp; Culture. Los demás gerentes no las ven; en la reunión solo se muestra quién ya votó y el resultado general.</p></div>
    </div>
  </div>
  <div class="seccion"><h3>Si ves estos mensajes</h3>
    <div class="estados">
      {captura("votar-08-aun-no-abierta", cel=True, marcas=False)}<p><b>«La votación aún no está abierta».</b> Vuelve al link cuando te avisen.</p>
      {captura("votar-10-ya-cerro", cel=True, marcas=False)}<p><b>«La votación ya cerró».</b> Ya no se pueden hacer cambios en esa ronda.</p>
    </div>
  </div>
</section>
"""
(D / "guia-para-votar.html").write_text(pagina("Guía para votar – Concurso Identidad", guia))
print("ok", len(SECCIONES), "secciones del manual del administrador")
