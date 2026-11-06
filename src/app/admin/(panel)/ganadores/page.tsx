import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { ConfirmarGanadores } from "@/components/resultados/confirmar-ganadores";
import { PaqueteAgencia } from "@/components/resultados/paquete-agencia";
import { buttonVariants } from "@/components/ui/button";
import { analizarCorte, empatesDentro } from "@/lib/corte";
import { exigirAdmin } from "@/lib/datos/auth";
import { resultadosDeRonda, rondaFinal } from "@/lib/datos/resultados";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ganadores · Concurso identidad" };

const LUGAR = ["", "1er lugar", "2º lugar", "3er lugar"];
const fecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export default async function GanadoresPage() {
  await exigirAdmin();
  const final = await rondaFinal();
  const d = final ? await resultadosDeRonda(final.id) : null;

  if (!d || d.ronda.estado !== "cerrada") {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Ganadores</h1>
        <p className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground" data-testid="sin-ganadores">
          Los ganadores aparecen cuando se cierra la Ronda {final?.numero ?? 3}
          {d ? ` (hoy está ${d.ronda.estado})` : ""}.
        </p>
        <Link href="/admin/rondas" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Ir a rondas
        </Link>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Ganadores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ronda {d.ronda.numero} · {d.ronda.nombre} · {d.enviaron} de {d.totalVotantes} gerentes enviaron ·{" "}
            <Link className="underline underline-offset-2" href={`/admin/rondas/${d.ronda.id}/resultados`}>
              ver ranking completo
            </Link>
          </p>
        </div>
        {d.ganadoresConfirmados && <PaqueteAgencia />}
      </div>

      {(corte.empate || empates.length > 0) && !d.ganadoresConfirmados && (
        <div className="flex gap-3 rounded-xl border border-advertencia/40 bg-advertencia-fondo px-4 py-3 text-advertencia-foreground" data-testid="aviso-empate-ganadores">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Hay empate {corte.empate ? `en el lugar ${corte.lugarEmpate}` : `en el lugar ${empates.join(" y ")}`}.</strong> Elige el
            orden final de los ganadores antes de publicarlos.
          </p>
        </div>
      )}

      {d.ganadoresConfirmados ? (
        <>
          <p className="text-sm text-muted-foreground" data-testid="confirmados">
            Confirmados el {fecha.format(new Date(d.ganadoresConfirmados.confirmado_at))}
            {d.ganadoresConfirmados.por && ` por ${d.ganadoresConfirmados.por}`}.
          </p>
          <div className="grid gap-5 md:grid-cols-3" data-testid="tarjetas-ganadores">
            {confirmados.map((f) => (
              <article key={f.propuesta_id} className="overflow-hidden rounded-2xl border bg-card shadow-sm" data-testid="ganador" data-lugar={f.posicion_final}>
                <div className="flex aspect-[4/3] items-center justify-center bg-lienzo-logo p-6">
                  {f.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                    <img src={f.logoUrl} alt={`Logo de ${f.nombre_propuesto}`} className="max-h-full max-w-full object-contain" />
                  )}
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-sm font-semibold tracking-wide text-primary uppercase">{LUGAR[f.posicion_final!]}</p>
                  <h2 className="text-2xl font-semibold">{f.nombre_propuesto}</h2>
                  <p className="line-clamp-5 text-sm leading-relaxed whitespace-pre-line text-foreground/80">{f.significado}</p>
                  <p className="border-t pt-2 text-sm">
                    <span className="font-medium">{f.participante}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {f.area} · {f.ciudad}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">Promedio {f.promedio_general?.toFixed(2) ?? "—"}</p>
                </div>
              </article>
            ))}
          </div>
          <ConfirmarGanadores rondaId={d.ronda.id} opciones={d.filas} inicial={confirmados.map((f) => f.propuesta_id)} cambiar />
        </>
      ) : (
        <ConfirmarGanadores rondaId={d.ronda.id} opciones={d.filas} inicial={propuesta} />
      )}
    </div>
  );
}
