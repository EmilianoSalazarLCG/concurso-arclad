import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerAdminActual } from "@/lib/datos/auth";
import { todasPropuestasFiltradas } from "@/lib/datos/gestion";
import { leerFiltros } from "@/lib/validacion/filtros";

export const dynamic = "force-dynamic";

/** Fecha/hora en la Ciudad de México como "hora de pared" para Excel (sin zona). */
function fechaCdmx(iso: string | null): Date | null {
  if (!iso) return null;
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return new Date(Date.UTC(+partes.year, +partes.month - 1, +partes.day, +partes.hour, +partes.minute, +partes.second));
}

/** Exporta a .xlsx las propuestas que cumplen los filtros actuales (sin rutas internas de Storage). */
export async function GET(request: NextRequest) {
  if (!(await obtenerAdminActual())) return NextResponse.redirect(new URL("/admin/login", request.url));
  const filas = await todasPropuestasFiltradas(leerFiltros(request.nextUrl.searchParams));

  const libro = new ExcelJS.Workbook();
  libro.creator = "Concurso identidad";
  libro.created = new Date();
  const hoja = libro.addWorksheet("Propuestas", { views: [{ state: "frozen", ySplit: 1 }] });
  const formatoFecha = "dd/mm/yyyy hh:mm";
  hoja.columns = [
    { header: "Folio", key: "folio", width: 8 },
    { header: "Nombre propuesto", key: "nombre_propuesto", width: 28 },
    { header: "Participante", key: "participante_nombre", width: 28 },
    { header: "Área", key: "area", width: 20 },
    { header: "Ciudad", key: "ciudad", width: 18 },
    { header: "Significado", key: "significado", width: 60 },
    { header: "Notas internas", key: "notas_internas", width: 40 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Motivo de descarte", key: "motivo_descarte", width: 30 },
    { header: "Capturada por", key: "capturada_por", width: 22 },
    { header: "Fecha de captura", key: "created_at", width: 18, style: { numFmt: formatoFecha } },
    { header: "Última edición por", key: "editada_por", width: 22 },
    { header: "Fecha de última edición", key: "updated_at", width: 18, style: { numFmt: formatoFecha } },
    { header: "Descartada por", key: "descartada_por", width: 22 },
    { header: "Fecha de descarte", key: "descartada_at", width: 18, style: { numFmt: formatoFecha } },
  ];

  for (const p of filas) {
    hoja.addRow({
      folio: String(p.folio).padStart(3, "0"),
      nombre_propuesto: p.nombre_propuesto,
      participante_nombre: p.participante_nombre,
      area: p.area,
      ciudad: p.ciudad,
      significado: p.significado,
      notas_internas: p.notas_internas ?? "",
      estado: p.estado === "activa" ? "Activa" : "Descartada",
      motivo_descarte: p.motivo_descarte ?? "",
      capturada_por: p.capturada_por_nombre ?? "",
      created_at: fechaCdmx(p.created_at),
      editada_por: p.updated_by ? (p.editada_por_nombre ?? "") : "",
      updated_at: p.updated_by ? fechaCdmx(p.updated_at) : null,
      descartada_por: p.descartada_por_nombre ?? "",
      descartada_at: fechaCdmx(p.descartada_at),
    });
  }

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6F4A" } };
  hoja.autoFilter = { from: "A1", to: { row: 1, column: hoja.columns.length } };
  for (const clave of ["significado", "notas_internas", "motivo_descarte"]) {
    hoja.getColumn(clave).alignment = { wrapText: true, vertical: "top" };
  }

  const buffer = await libro.xlsx.writeBuffer();
  const nombre = `propuestas-concurso-identidad-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
