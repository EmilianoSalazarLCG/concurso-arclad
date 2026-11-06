import Link from "next/link";
import { BarChart3Icon, ChevronRightIcon, TrophyIcon } from "lucide-react";
import { AccionesRonda } from "@/components/admin/acciones-ronda";
import { CopiarLink } from "@/components/admin/copiar-link";
import { Embudo } from "@/components/admin/embudo";
import { EncabezadoPagina } from "@/components/admin/encabezado-pagina";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { totalVotantes } from "@/config/votantes";
import { exigirAdmin } from "@/lib/datos/auth";
import { contarPropuestas } from "@/lib/datos/propuestas";
import { resumenRondas } from "@/lib/datos/rondas";
import { linkVotacion } from "@/lib/link-votacion";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rondas · Concurso Identidad" };

const ETIQUETA = { pendiente: "Pendiente", abierta: "Abierta", cerrada: "Cerrada" } as const;
const VARIANTE = { pendiente: "outline", abierta: "solido", cerrada: "secondary" } as const;

export default async function RondasPage() {
  await exigirAdmin();
  const [rondas, total, link, { activas }] = await Promise.all([resumenRondas(), totalVotantes(), linkVotacion(), contarPropuestas()]);
  const abierta = rondas.find((r) => r.estado === "abierta");

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        antetitulo="Votación"
        titulo="Rondas"
        descripcion={
          <>
            Solo una ronda puede estar abierta a la vez. Los gerentes votan desde{" "}
            <span className="font-semibold text-foreground">{link.corto}</span>
          </>
        }
        acciones={
          <>
            <Link href="/admin/ganadores" className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="ir-ganadores">
              <TrophyIcon data-icon="inline-start" className="text-oro" /> Ganadores
            </Link>
            <CopiarLink url={link.url} />
          </>
        }
      />

      <Embudo activas={activas} rondas={rondas} />

      <div className="grid gap-4">
        {rondas.map((r, i) => {
          const estado = r.estado as keyof typeof ETIQUETA;
          const pct = Math.round((r.enviados / Math.max(1, total)) * 100);
          return (
            <section
              key={r.id}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(
                "aparecer rounded-2xl border bg-card p-5 shadow-xs sm:p-6",
                estado === "abierta" && "border-primary/40 shadow-md ring-2 ring-primary/10",
              )}
              data-testid={`ronda-${r.numero}`}
            >
              <div className="flex flex-wrap items-start gap-5">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl font-heading text-2xl font-semibold cifras",
                    estado === "abierta" ? "bg-primary text-primary-foreground" : estado === "cerrada" ? "bg-tinta text-tinta-foreground" : "bg-secondary text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {r.numero}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-2xl font-semibold">
                      Ronda {r.numero} · {r.nombre}
                    </h2>
                    <Badge variant={VARIANTE[estado]} data-testid={`estado-ronda-${r.numero}`}>
                      {ETIQUETA[estado]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pasan las mejores {r.top_n} ·{" "}
                    <span className="font-semibold text-foreground" data-testid={`propuestas-ronda-${r.numero}`}>
                      {r.propuestas} propuesta{r.propuestas === 1 ? "" : "s"}
                    </span>
                  </p>
                  <div className="flex items-center gap-3 pt-1.5">
                    <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className={cn("text-sm cifras", estado !== "pendiente" ? "font-semibold text-foreground" : "text-muted-foreground")} data-testid={`avance-ronda-${r.numero}`}>
                      {r.enviados} de {total} enviaron
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-start gap-2 sm:w-auto">
                  {estado !== "pendiente" && (
                    <Link href={`/admin/rondas/${r.id}/resultados`} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid={`resultados-${r.numero}`}>
                      <BarChart3Icon data-icon="inline-start" /> Resultados
                    </Link>
                  )}
                  <Link href={`/admin/rondas/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid={`gestionar-${r.numero}`}>
                    Propuestas <ChevronRightIcon data-icon="inline-end" />
                  </Link>
                  <AccionesRonda
                    rondaId={r.id}
                    numero={r.numero}
                    estado={estado}
                    propuestas={r.propuestas}
                    otraAbierta={Boolean(abierta && abierta.id !== r.id)}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
