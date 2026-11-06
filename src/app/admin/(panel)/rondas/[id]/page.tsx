import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AccionesRonda } from "@/components/admin/acciones-ronda";
import { PropuestasRonda } from "@/components/admin/propuestas-ronda";
import { Badge } from "@/components/ui/badge";
import { exigirAdmin } from "@/lib/datos/auth";
import { propuestasDeRonda, propuestasDisponibles, resumenRondas } from "@/lib/datos/rondas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propuestas de la ronda · Concurso identidad" };

export default async function RondaPage({ params }: PageProps<"/admin/rondas/[id]">) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const rondas = await resumenRondas();
  const r = rondas.find((x) => x.id === id);
  if (!r) notFound();
  const [asignadas, disponibles] = await Promise.all([propuestasDeRonda(id), propuestasDisponibles(id)]);
  const estado = r.estado as "pendiente" | "abierta" | "cerrada";
  const abierta = rondas.find((x) => x.estado === "abierta");

  return (
    <div className="space-y-6">
      <Link href="/admin/rondas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Rondas
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Ronda {r.numero} · {r.nombre}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{estado}</Badge> Pasan las mejores {r.top_n}
          </p>
        </div>
        <AccionesRonda rondaId={r.id} numero={r.numero} estado={estado} propuestas={r.propuestas} otraAbierta={Boolean(abierta && abierta.id !== r.id)} />
      </div>
      <PropuestasRonda
        rondaId={r.id}
        editable={estado === "pendiente"}
        mostrarAgregarTodas={r.numero === 1}
        asignadas={asignadas.filter((p) => p.estado === "activa")}
        disponibles={disponibles}
      />
    </div>
  );
}
