import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { EncabezadoPagina } from "@/components/admin/encabezado-pagina";
import { EstadoVacio } from "@/components/estado-vacio";
import { ConfirmarGanadores } from "@/components/resultados/confirmar-ganadores";
import { PaqueteAgencia } from "@/components/resultados/paquete-agencia";
import { buttonVariants } from "@/components/ui/button";
import { analizarCorte, empatesDentro } from "@/lib/corte";
import { exigirAdmin } from "@/lib/datos/auth";
import { resultadosDeRonda, rondaFinal } from "@/lib/datos/resultados";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ganadores · Concurso Identidad" };

const LUGAR = ["", "1er lugar", "2º lugar", "3er lugar"];
const fecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export default async function GanadoresPage() {
  await exigirAdmin();
  const final = await rondaFinal();
  const d = final ? await resultadosDeRonda(final.id) : null;

  if (!d || d.ronda.estado !== "cerrada") {
    return (
      <div className="space-y-8">
        <EncabezadoPagina antetitulo="Ronda final" titulo="Ganadores" />
        <EstadoVacio
          testid="sin-ganadores"
          titulo="Los ganadores aún no se conocen"
          accion={
            <Link href="/admin/rondas" className={buttonVariants({ variant: "outline" })}>
              Ir a rondas
            </Link>
          }
        >
          Los ganadores aparecen cuando se cierra la Ronda {final?.numero ?? 3}
          {d ? ` (hoy está ${d.ronda.estado})` : ""}.
        </EstadoVacio>
      </div>
    );
  }

  const topN = d.ronda.top_n;
  const corte = analizarCorte(d.filas, topN);
  const empates = empatesDentro(d.filas, topN);
  const confirmados = d.ganadoresConfirmados
    ? d.filas.filter((f) => f.posicion_final).sort((a, b) => a.posicion_final! - b.posicion_final!)
    : [];
  const propuesta = d.filas.slice(0, topN).map((f) => f.propuesta_id);

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        antetitulo={`Ronda final · ${d.enviaron} de ${d.totalVotantes} ${d.etiquetaVotantes} enviaron`}
        titulo={
          <>
            Los <em className="font-medium text-oro-foreground">ganadores</em>
          </>
        }
        descripcion={
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/admin/rondas/${d.ronda.id}/resultados`}>
            Ver el ranking completo de la Ronda {d.ronda.numero}
          </Link>
        }
        acciones={d.ganadoresConfirmados ? <PaqueteAgencia /> : undefined}
      />

      {(corte.empate || empates.length > 0) && !d.ganadoresConfirmados && (
        <div className="flex gap-3.5 rounded-xl border border-advertencia/30 bg-advertencia-fondo px-5 py-4 text-advertencia-foreground shadow-xs" data-testid="aviso-empate-ganadores">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-advertencia text-white">
            <AlertTriangleIcon className="size-5" />
          </span>
          <p>
            <strong>Hay empate {corte.empate ? `en el lugar ${corte.lugarEmpate}` : `en el lugar ${empates.join(" y ")}`}.</strong> Elige el
            orden final de los ganadores antes de publicarlos.
          </p>
        </div>
      )}

      {d.ganadoresConfirmados ? (
        <>
          <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="confirmados">
            <span className="size-2 rounded-full bg-oro" aria-hidden />
            Confirmados el {fecha.format(new Date(d.ganadoresConfirmados.confirmado_at))}
            {d.ganadoresConfirmados.por && ` por ${d.ganadoresConfirmados.por}`}.
          </p>
          <div className="grid items-end gap-5 md:grid-cols-3" data-testid="tarjetas-ganadores">
            {confirmados.map((f, i) => {
              const lugar = f.posicion_final!;
              const medalla = lugar === 1 ? "bg-oro text-tinta" : lugar === 2 ? "bg-plata text-tinta" : "bg-bronce text-white";
              const banda = lugar === 1 ? "bg-oro" : lugar === 2 ? "bg-plata" : "bg-bronce";
              return (
                <article
                  key={f.propuesta_id}
                  data-testid="ganador"
                  data-lugar={lugar}
                  style={{ "--i": i } as React.CSSProperties}
                  className={cn(
                    "aparecer relative overflow-hidden rounded-2xl border bg-card shadow-sm",
                    lugar === 1 && "border-oro/60 shadow-lg ring-4 ring-oro/15 md:order-2 md:-translate-y-4",
                    lugar === 2 && "md:order-1",
                    lugar === 3 && "md:order-3",
                  )}
                >
                  <span className={cn("absolute inset-x-0 top-0 h-1.5", banda)} aria-hidden />
                  <div className="m-2 mt-3.5 flex aspect-[4/3] items-center justify-center rounded-xl bg-lienzo-logo p-6">
                    {f.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                      <img src={f.logoUrl} alt={`Logo de ${f.nombre_propuesto}`} className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                  <div className="space-y-3 p-5 pt-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex size-9 items-center justify-center rounded-full font-heading text-lg font-semibold shadow-xs cifras", medalla)}>{lugar}</span>
                      <p className={cn("text-sm font-bold tracking-[0.14em] uppercase", lugar === 1 ? "text-oro-foreground" : "text-muted-foreground")}>{LUGAR[lugar]}</p>
                      <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold cifras">{f.promedio_general?.toFixed(2) ?? "—"}</span>
                    </div>
                    <h2 className="text-3xl leading-tight font-semibold">{f.nombre_propuesto}</h2>
                    <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-foreground/75">{f.significado}</p>
                    <p className="border-t border-border pt-3 text-sm">
                      <span className="block font-semibold">{f.participante}</span>
                      <span className="text-muted-foreground">
                        {f.area} · {f.ciudad}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
          <ConfirmarGanadores rondaId={d.ronda.id} opciones={d.filas} inicial={confirmados.map((f) => f.propuesta_id)} cambiar />
        </>
      ) : (
        <ConfirmarGanadores rondaId={d.ronda.id} opciones={d.filas} inicial={propuesta} />
      )}
    </div>
  );
}
