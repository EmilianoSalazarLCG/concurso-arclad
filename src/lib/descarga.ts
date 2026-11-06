/** Content-Disposition con nombre legible (espacios/acentos) y respaldo ASCII. */
export function adjunto(nombre: string): string {
  const ascii = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}
