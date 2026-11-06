"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { NoAutorizadoError } from "@/lib/datos/auth";
import { confirmarGanadores, resultadosDeRonda, rondaFinal } from "@/lib/datos/resultados";
import { falla, ok, type Resultado } from "@/lib/datos/tipos";
import { EXCEL, estilizarEncabezado } from "@/lib/excel-marca";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function protegido<T>(fn: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof NoAutorizadoError) return falla(e.message);
    console.error(e);
    return falla("Ocurrió un error inesperado. Intenta de nuevo.");
  }
}

export async function confirmar(rondaId: string, ids: string[]): Promise<Resultado<null>> {
  return protegido(async () => {
    if (!UUID.test(rondaId) || !Array.isArray(ids) || !ids.every((x) => UUID.test(x))) return falla("Datos no válidos.");
    const r = await confirmarGanadores(rondaId, ids);
    revalidatePath("/admin", "layout");
    return r;
  });
}

const limpio = (t: string) => t.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "propuesta";

/**
 * Paquete para la agencia: URLs firmadas (10 min) de los logos originales del Top 3
 * ("1 - Nombre.png") y un Excel en base64. El ZIP se arma en el navegador.
 */
export async function paqueteAgencia(): Promise<Resultado<{ logos: { nombre: string; url: string }[]; excel: string }>> {
  return protegido(async () => {
    const final = await rondaFinal();
    if (!final) return falla("No hay ronda final.");
    const d = await resultadosDeRonda(final.id);
    if (!d?.ganadoresConfirmados) return falla("Primero confirma a los ganadores.");
    const top = d.filas.filter((f) => f.posicion_final).sort((a, b) => a.posicion_final! - b.posicion_final!);

    const { data, error } = await createAdminClient().storage.from("logos").createSignedUrls(top.map((f) => f.logo_path), 600);
    if (error || !data) return falla("No se pudieron preparar los logos.");
    const url = new Map(data.map((x) => [x.path, x.signedUrl]));

    const libro = new ExcelJS.Workbook();
    libro.creator = "Concurso Identidad";
    const hoja = libro.addWorksheet("Ganadores");
    hoja.columns = [
      { header: "Posición", key: "posicion", width: 10 },
      { header: "Nombre propuesto", key: "nombre", width: 28 },
      { header: "Significado", key: "significado", width: 70 },
      { header: "Participante", key: "participante", width: 26 },
      { header: "Área", key: "area", width: 18 },
      { header: "Ciudad", key: "ciudad", width: 16 },
      { header: "Archivo del logo", key: "archivo", width: 30 },
    ];
    const logos = top.map((f) => ({
      nombre: `${f.posicion_final} - ${limpio(f.nombre_propuesto)}.${f.logo_path.endsWith(".jpg") ? "jpg" : "png"}`,
      url: url.get(f.logo_path) ?? "",
    }));
    top.forEach((f, i) =>
      hoja.addRow({
        posicion: f.posicion_final,
        nombre: f.nombre_propuesto,
        significado: f.significado,
        participante: f.participante,
        area: f.area,
        ciudad: f.ciudad,
        archivo: logos[i].nombre,
      }),
    );
    estilizarEncabezado(hoja, EXCEL.tinta);
    hoja.getColumn("significado").alignment = { wrapText: true, vertical: "top" };
    const buffer = Buffer.from(await libro.xlsx.writeBuffer());
    return ok({ logos, excel: buffer.toString("base64") });
  });
}
