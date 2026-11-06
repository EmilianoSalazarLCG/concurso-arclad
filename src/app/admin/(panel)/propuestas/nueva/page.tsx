import { EncabezadoPagina } from "@/components/admin/encabezado-pagina";
import { FormularioPropuesta } from "@/components/propuestas/formulario-propuesta";
import { exigirAdmin } from "@/lib/datos/auth";
import { valoresAutocompletar } from "@/lib/datos/propuestas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capturar propuesta · Concurso Identidad" };

export default async function NuevaPropuestaPage() {
  await exigirAdmin();
  const { areas, ciudades } = await valoresAutocompletar();

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        antetitulo="Nueva propuesta"
        titulo="Capturar propuesta"
        descripcion={
          <>
            Todos los campos son obligatorios excepto las notas internas. Pega el logo con{" "}
            <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-xs shadow-xs">⌘V</kbd> y guarda con{" "}
            <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-xs shadow-xs">⌘↵</kbd>.
          </>
        }
      />
      <FormularioPropuesta areas={areas} ciudades={ciudades} />
    </div>
  );
}
