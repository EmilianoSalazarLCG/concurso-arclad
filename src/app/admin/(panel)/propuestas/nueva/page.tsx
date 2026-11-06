import { FormularioPropuesta } from "@/components/propuestas/formulario-propuesta";
import { exigirAdmin } from "@/lib/datos/auth";
import { valoresAutocompletar } from "@/lib/datos/propuestas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capturar propuesta · Concurso identidad" };

export default async function NuevaPropuestaPage() {
  await exigirAdmin();
  const { areas, ciudades } = await valoresAutocompletar();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Capturar propuesta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos los campos son obligatorios excepto las notas internas.
        </p>
      </div>
      <FormularioPropuesta areas={areas} ciudades={ciudades} />
    </div>
  );
}
