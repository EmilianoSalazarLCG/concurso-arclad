// Exporta los manuales HTML a PDF (tamaño carta) con Playwright.
// Uso (desde la raíz del repo):
//   npx -y -p playwright-core@1.56.1 node docs/manual/exportar-pdf.mjs
// Usa Google Chrome instalado; o define CHROMIUM_PATH con la ruta a otro Chromium.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const aqui = dirname(fileURLToPath(import.meta.url));

const MANUALES = [
  ["manual-administrador.html", "Manual del administrador - Concurso Identidad.pdf"],
  ["guia-para-votar.html", "Guia para votar - Concurso Identidad.pdf"],
];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" },
);
const page = await browser.newPage();
for (const [html, pdf] of MANUALES) {
  await page.goto(pathToFileURL(join(aqui, html)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))));
  await page.pdf({ path: join(aqui, pdf), preferCSSPageSize: true, printBackground: true });
  console.log("PDF:", pdf);
}
await browser.close();
