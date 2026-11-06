# Manuales · Concurso Identidad

- `Manual del administrador - Concurso Identidad.pdf` (17 páginas) — para People & Culture.
- `Guia para votar - Concurso Identidad.pdf` (4 páginas) — para los 11 gerentes.

## Cómo actualizarlos
1. Edita el texto en `generar-manuales.py` (o directamente en los HTML) y los estilos en `estilos.css`.
2. Regenera los HTML: `python3 docs/manual/generar-manuales.py docs/manual`
3. Exporta los PDF (tamaño carta): `npx -y -p playwright-core@1.56.1 node docs/manual/exportar-pdf.mjs`

Las capturas (`capturas/`) se tomaron con datos ficticios; `capturas/marcadores.json` guarda la
posición de los marcadores numerados. Nunca debe aparecer «ARclad», «London» ni «LCG», excepto el
dominio concurso-arclad.vercel.app.
