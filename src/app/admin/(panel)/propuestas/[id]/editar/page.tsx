import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { EncabezadoPagina } from "@/components/admin/encabezado-pagina";
import { FormularioPropuesta } from "@/components/propuestas/formulario-propuesta";
import { exigirAdmin } from "@/lib/datos/auth";
import { urlFirmadaLogo } from "@/lib/datos/logos";
import { obtenerPropuesta, valoresAutocompletar } from "@/lib/datos/propuestas";
import { formatearFolio } from "@/lib/datos/tipos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar propuesta · Concurso Identidad" };

export default async function EditarPropuestaPage({ params }: PageProps<"/admin/propuestas/[id]/editar">) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await obtenerPropuesta(id);
  if (!p) notFound();
  const [{ areas, ciudades }, logoUrl] = await Promise.all([valoresAutocompletar(), urlFirmadaLogo(p.logo_path)]);
  const folio = formatearFolio(p.folio);

  return (
    <div className="space-y-6">
      <Link href={`/admin/propuestas/${p.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Volver al detalle
      </Link>
      <EncabezadoPagina
        antetitulo={`Folio ${folio}`}
        titulo="Editar propuesta"
        descripcion="El folio no cambia. Si reemplazas el logo, el anterior se borra al guardar."
      />
      <FormularioPropuesta
        areas={areas}
        ciudades={ciudades}
        inicial={{
          id: p.id,
          folio,
          logoUrl: logoUrl ?? "",
          campos: {
            participante_nombre: p.participante_nombre,
            area: p.area,
            ciudad: p.ciudad,
            nombre_propuesto: p.nombre_propuesto,
            significado: p.significado,
            notas_internas: p.notas_internas ?? "",
          },
        }}
      />
    </div>
  );
}
