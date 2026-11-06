import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon, FileSpreadsheetIcon, TrophyIcon } from "lucide-react";
import { EncabezadoPagina } from "@/components/admin/encabezado-pagina";
import { EstadoVacio } from "@/components/estado-vacio";
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
export const metadata = { title: "Resultados · Concurso Identidad" };

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

      <EncabezadoPagina
        antetitulo={`Ronda ${ronda.numero} de ${d.totalRondas} · ${ronda.nombre}`}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Resultados
            <Badge variant={ronda.estado === "abierta" ? "solido" : "secondary"} className="font-sans">
              {ronda.estado === "abierta" ? "Abierta" : ronda.estado === "cerrada" ? "Cerrada" : "Pendiente"}
            </Badge>
          </span>
        }
        descripcion={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Pasan las mejores {ronda.top_n}</span>
            <span className="font-semibold text-foreground cifras" data-testid="enviaron">
              {d.enviaron} de {d.totalVotantes} gerentes enviaron
            </span>
            {ronda.estado === "abierta" && <AutoRefrescar segundos={10} />}
          </span>
        }
        acciones={
          <>
            <a href={`/admin/rondas/${ronda.id}/resultados/exportar`} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="exportar-resultados">
              <FileSpreadsheetIcon data-icon="inline-start" /> Exportar a Excel
            </a>
            {puedeAvanzar && (
              <Link href={`/admin/rondas/${ronda.id}/avanzar`} className={buttonVariants({ size: "sm" })} data-testid="pasar-ronda">
                Pasar a la Ronda {siguiente!.numero} <ArrowRightIcon data-icon="inline-end" />
              </Link>
            )}
            {esFinal && ronda.estado === "cerrada" && (
              <Link href="/admin/ganadores" className={buttonVariants({ variant: "oro", size: "sm" })} data-testid="ver-ganadores">
                <TrophyIcon data-icon="inline-start" /> Ganadores
              </Link>
            )}
          </>
        }
      />

      {ronda.estado === "abierta" && (
        <p className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          La votación sigue abierta: el ranking puede cambiar. Solo cuentan los votos enviados.
        </p>
      )}

      {d.avance && siguiente && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent px-5 py-4 text-sm text-accent-foreground" data-testid="avance-realizado">
          <p>
            <strong>{d.avance.propuestas} propuestas pasaron a la Ronda {siguiente.numero}</strong> el {fecha.format(new Date(d.avance.realizado_at))}
            {d.avance.por && ` por ${d.avance.por}`}.
          </p>
          {puedeDeshacer && <DeshacerAvance rondaId={ronda.id} siguiente={siguiente.numero} />}
        </div>
      )}

      {!d.avance && corte.empate && (
        <div className="flex gap-3.5 rounded-xl border border-advertencia/30 bg-advertencia-fondo px-5 py-4 text-advertencia-foreground shadow-xs" data-testid="aviso-empate">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-advertencia text-white">
            <AlertTriangleIcon className="size-5" />
          </span>
          <p>
            <strong>Empate en el lugar {corte.lugarEmpate}.</strong> {corte.empatadas.length} propuestas empatan y{" "}
            {corte.cupoEmpate === 1 ? "solo cabe 1" : `caben ${corte.cupoEmpate}`} dentro del Top {ronda.top_n}.{" "}
            {esFinal ? "Resuélvelo al confirmar los ganadores." : "Decide cuál pasa al usar «Pasar a la siguiente ronda»."}
          </p>
        </div>
      )}
      {esFinal && empatesTop.length > 0 && (
        <div className="flex gap-3.5 rounded-xl border border-advertencia/30 bg-advertencia-fondo px-5 py-4 text-advertencia-foreground shadow-xs" data-testid="aviso-empate-top">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-advertencia text-white">
            <AlertTriangleIcon className="size-5" />
          </span>
          <p>
            <strong>Empate en el lugar {empatesTop.join(" y ")}.</strong> Resuélvelo en «Ganadores» antes de publicarlos.
          </p>
        </div>
      )}

      {filas.length === 0 ? (
        <EstadoVacio titulo="Esta ronda no tiene propuestas">Agrega propuestas desde la página de la ronda antes de abrirla.</EstadoVacio>
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
