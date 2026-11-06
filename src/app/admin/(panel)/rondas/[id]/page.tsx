import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AccionesRonda } from "@/components/admin/acciones-ronda";
import { PropuestasRonda } from "@/components/admin/propuestas-ronda";
import { EncabezadoPagina } from "@/components/admin/encabezado-pagina";
import { exigirAdmin } from "@/lib/datos/auth";
import { propuestasDeRonda, propuestasDisponibles, resumenRondas } from "@/lib/datos/rondas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propuestas de la ronda · Concurso Identidad" };

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
      <EncabezadoPagina
        antetitulo={`Ronda ${r.numero} · ${estado}`}
        titulo={r.nombre}
        descripcion={`Pasan las mejores ${r.top_n}. Las propuestas solo se agregan o quitan mientras la ronda está pendiente.`}
        acciones={
          <AccionesRonda rondaId={r.id} numero={r.numero} estado={estado} propuestas={r.propuestas} otraAbierta={Boolean(abierta && abierta.id !== r.id)} />
        }
      />
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
