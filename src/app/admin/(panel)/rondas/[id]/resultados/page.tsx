import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon, FileSpreadsheetIcon, TrophyIcon } from "lucide-react";
import { AutoRefrescar } from "@/components/resultados/auto-refrescar";
import { DeshacerAvance } from "@/components/resultados/deshacer-avance";
import { TablaResultados } from "@/components/resultados/tabla-resultados";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { analizarCorte, empatesDentro } from "@/lib/corte";
import { exigirAdmin } from "@/lib/datos/auth";
import { resultadosDeRonda } from "@/lib/datos/resultados";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resultados · Concurso identidad" };

const fecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export default async function ResultadosPage({ params }: PageProps<"/admin/rondas/[id]/resultados">) {
  await exigirAdmin();
  const { id } = await params;
  const d = await resultadosDeRonda(id);
  if (!d) notFound();
  const { ronda, siguiente, filas } = d;
  const esFinal = ronda.numero === d.totalRondas;
  const corte = analizarCorte(filas, ronda.top_n);
  const empatesTop = esFinal ? empatesDentro(filas, ronda.top_n) : [];
  const pasan = d.avance ? d.avanzadas : corte.dentro;
  const empatadas = d.avance ? [] : corte.empatadas;
  const textoCorte = esFinal ? `Top ${ronda.top_n} (ganadores)` : `Pasan a la Ronda ${ronda.numero + 1}`;
  const puedeAvanzar = ronda.estado === "cerrada" && siguiente && !d.avance && siguiente.estado === "pendiente" && siguiente.propuestas === 0;
  const puedeDeshacer = d.avance && siguiente && siguiente.estado === "pendiente" && !siguiente.conVotos;

  return (
    <div className="space-y-6">
      <Link href="/admin/rondas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Rondas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Resultados · Ronda {ronda.numero} de {d.totalRondas}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={ronda.estado === "abierta" ? "default" : "secondary"}>{ronda.estado}</Badge>
            {ronda.nombre} · pasan las mejores {ronda.top_n} ·{" "}
            <span className="font-medium text-foreground" data-testid="enviaron">
              {d.enviaron} de {d.totalVotantes} gerentes enviaron
            </span>
          </p>
          {ronda.estado === "abierta" && (
            <div className="mt-2">
              <AutoRefrescar segundos={10} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/rondas/${ronda.id}/resultados/exportar`} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="exportar-resultados">
            <FileSpreadsheetIcon data-icon="inline-start" /> Exportar a Excel
          </a>
          {puedeAvanzar && (
            <Link href={`/admin/rondas/${ronda.id}/avanzar`} className={buttonVariants({ size: "sm" })} data-testid="pasar-ronda">
              Pasar a la Ronda {siguiente!.numero} <ArrowRightIcon data-icon="inline-end" />
            </Link>
          )}
          {esFinal && ronda.estado === "cerrada" && (
            <Link href="/admin/ganadores" className={buttonVariants({ size: "sm" })} data-testid="ver-ganadores">
              <TrophyIcon data-icon="inline-start" /> Ganadores
            </Link>
          )}
        </div>
      </div>

      {ronda.estado === "abierta" && (
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          La votación sigue abierta: el ranking puede cambiar. Solo cuentan los votos enviados.
        </p>
      )}

      {d.avance && siguiente && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent/50 px-4 py-3 text-sm" data-testid="avance-realizado">
          <p>
            <strong>{d.avance.propuestas} propuestas pasaron a la Ronda {siguiente.numero}</strong> el {fecha.format(new Date(d.avance.realizado_at))}
            {d.avance.por && ` por ${d.avance.por}`}.
          </p>
          {puedeDeshacer && <DeshacerAvance rondaId={ronda.id} siguiente={siguiente.numero} />}
        </div>
      )}

      {!d.avance && corte.empate && (
        <div className="flex gap-3 rounded-xl border border-advertencia/40 bg-advertencia-fondo px-4 py-3 text-advertencia-foreground" data-testid="aviso-empate">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Empate en el lugar {corte.lugarEmpate}.</strong> {corte.empatadas.length} propuestas empatan y{" "}
            {corte.cupoEmpate === 1 ? "solo cabe 1" : `caben ${corte.cupoEmpate}`} dentro del Top {ronda.top_n}.{" "}
            {esFinal ? "Resuélvelo al confirmar los ganadores." : "Decide cuál pasa al usar «Pasar a la siguiente ronda»."}
          </p>
        </div>
      )}
      {esFinal && empatesTop.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-advertencia/40 bg-advertencia-fondo px-4 py-3 text-advertencia-foreground" data-testid="aviso-empate-top">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Empate en el lugar {empatesTop.join(" y ")}.</strong> Resuélvelo en «Ganadores» antes de publicarlos.
          </p>
        </div>
      )}

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">Esta ronda no tiene propuestas.</p>
      ) : (
        <TablaResultados
          rondaId={ronda.id}
          filas={filas}
          criterios={d.criterios}
          pasan={pasan}
          empatadas={empatadas}
          textoCorte={textoCorte}
        />
      )}
      <p className={cn("text-xs text-muted-foreground")}>Haz clic en una propuesta para ver la calificación de cada gerente.</p>
    </div>
  );
}
