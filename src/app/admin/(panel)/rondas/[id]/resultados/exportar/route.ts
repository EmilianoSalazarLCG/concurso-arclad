import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerAdminActual } from "@/lib/datos/auth";
import { detalleRonda, resultadosDeRonda } from "@/lib/datos/resultados";
import { adjunto } from "@/lib/descarga";
import { estilizarEncabezado } from "@/lib/excel-marca";

export const dynamic = "force-dynamic";

/** Excel de resultados: hoja «Ranking» y hoja «Detalle por gerente». */
export async function GET(request: NextRequest, { params }: RouteContext<"/admin/rondas/[id]/resultados/exportar">) {
  if (!(await obtenerAdminActual())) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { id } = await params;
  const d = await resultadosDeRonda(id);
  if (!d) return new NextResponse("No encontrado", { status: 404 });
  const detalle = await detalleRonda(id);

  const libro = new ExcelJS.Workbook();
  libro.creator = "Concurso Identidad";
  const estilo = (hoja: ExcelJS.Worksheet) => estilizarEncabezado(hoja);

  const ranking = libro.addWorksheet("Ranking", { views: [{ state: "frozen", ySplit: 1 }] });
  ranking.columns = [
    { header: "Posición", key: "posicion", width: 10 },
    { header: "Folio", key: "folio", width: 8 },
    { header: "Nombre propuesto", key: "nombre", width: 28 },
    { header: "Participante", key: "participante", width: 26 },
    { header: "Área", key: "area", width: 18 },
    { header: "Ciudad", key: "ciudad", width: 16 },
    { header: "Promedio general", key: "promedio", width: 16, style: { numFmt: "0.00" } },
    ...d.criterios.map((c) => ({ header: c.nombre, key: `c_${c.id}`, width: 18, style: { numFmt: "0.00" } })),
    { header: "Gerentes que votaron", key: "gerentes", width: 18 },
    { header: "Pasa a la siguiente ronda", key: "pasa", width: 20 },
  ];
  const pasan = new Set(d.avanzadas);
  for (const f of d.filas) {
    ranking.addRow({
      posicion: f.posicion,
      folio: String(f.folio).padStart(3, "0"),
      nombre: f.nombre_propuesto,
      participante: f.participante,
      area: f.area,
      ciudad: f.ciudad,
      promedio: f.promedio_general,
      ...Object.fromEntries(d.criterios.map((c) => [`c_${c.id}`, f.promedio_por_criterio.find((p) => p.criterio_id === c.id)?.promedio ?? null])),
      gerentes: f.gerentes,
      pasa: d.siguiente ? (d.avance ? (pasan.has(f.propuesta_id) ? "Sí" : "No") : "Pendiente de avance") : f.posicion_final ? `Lugar ${f.posicion_final}` : "",
    });
  }
  estilo(ranking);

  const hojaDetalle = libro.addWorksheet("Detalle por gerente", { views: [{ state: "frozen", ySplit: 1 }] });
  hojaDetalle.columns = [
    { header: "Folio", key: "folio", width: 8 },
    { header: "Nombre propuesto", key: "nombre", width: 28 },
    { header: "Gerente", key: "gerente", width: 24 },
    ...d.criterios.map((c) => ({ header: c.nombre, key: `c_${c.id}`, width: 18 })),
    { header: "Promedio del gerente", key: "promedio", width: 18, style: { numFmt: "0.00" } },
  ];
  for (const f of d.filas) {
    for (const g of detalle.get(f.propuesta_id) ?? []) {
      hojaDetalle.addRow({
        folio: String(f.folio).padStart(3, "0"),
        nombre: f.nombre_propuesto,
        gerente: g.votante,
        ...Object.fromEntries(d.criterios.map((c) => [`c_${c.id}`, g.puntajes[c.id] ?? null])),
        promedio: g.promedio,
      });
    }
  }
  estilo(hojaDetalle);

  const buffer = await libro.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": adjunto(`Concurso Identidad - Resultados Ronda ${d.ronda.numero}.xlsx`),
      "Cache-Control": "no-store",
    },
  });
}
