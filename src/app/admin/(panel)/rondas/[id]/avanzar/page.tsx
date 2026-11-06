import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { SeleccionAvance } from "@/components/resultados/seleccion-avance";
import { analizarCorte } from "@/lib/corte";
import { exigirAdmin } from "@/lib/datos/auth";
import { resultadosDeRonda } from "@/lib/datos/resultados";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pasar a la siguiente ronda · Concurso identidad" };

export default async function AvanzarPage({ params }: PageProps<"/admin/rondas/[id]/avanzar">) {
  await exigirAdmin();
  const { id } = await params;
  const d = await resultadosDeRonda(id);
  if (!d) notFound();
  const { ronda, siguiente } = d;
  if (ronda.estado !== "cerrada" || !siguiente || d.avance) redirect(`/admin/rondas/${id}/resultados`);
  const corte = analizarCorte(d.filas, ronda.top_n);

  return (
    <div className="space-y-6">
      <Link href={`/admin/rondas/${id}/resultados`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Resultados de la Ronda {ronda.numero}
      </Link>
      <div>
        <h1 className="text-3xl font-semibold">Pasar a la Ronda {siguiente.numero}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Se preseleccionó el Top {ronda.top_n} según el ranking. Puedes quitar o agregar (por ejemplo, para resolver un empate) antes de confirmar.
        </p>
      </div>
      <SeleccionAvance
        rondaId={ronda.id}
        numeroSiguiente={siguiente.numero}
        topN={ronda.top_n}
        filas={d.filas.map((f) => ({
          id: f.propuesta_id,
          posicion: f.posicion,
          folio: f.folio,
          nombre: f.nombre_propuesto,
          promedio: f.promedio_general,
          logoUrl: f.logoUrl,
        }))}
        preseleccion={corte.dentro}
        empatadas={corte.empatadas}
        lugarEmpate={corte.lugarEmpate}
      />
    </div>
  );
}
