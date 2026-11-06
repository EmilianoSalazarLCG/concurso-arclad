import Link from "next/link";
import { BarChart3Icon, ChevronRightIcon, TrophyIcon } from "lucide-react";
import { AccionesRonda } from "@/components/admin/acciones-ronda";
import { CopiarLink } from "@/components/admin/copiar-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { totalVotantes } from "@/config/votantes";
import { exigirAdmin } from "@/lib/datos/auth";
import { resumenRondas } from "@/lib/datos/rondas";
import { linkVotacion } from "@/lib/link-votacion";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rondas · Concurso identidad" };

const ETIQUETA = { pendiente: "Pendiente", abierta: "Abierta", cerrada: "Cerrada" } as const;

export default async function RondasPage() {
  await exigirAdmin();
  const [rondas, total, link] = await Promise.all([resumenRondas(), totalVotantes(), linkVotacion()]);
  const abierta = rondas.find((r) => r.estado === "abierta");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Rondas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo una ronda puede estar abierta a la vez. Los gerentes votan desde{" "}
            <span className="font-mono text-foreground">{link.corto}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ganadores" className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="ir-ganadores">
            <TrophyIcon data-icon="inline-start" /> Ganadores
          </Link>
          <CopiarLink url={link.url} />
        </div>
      </div>

      <div className="grid gap-4">
        {rondas.map((r) => {
          const estado = r.estado as keyof typeof ETIQUETA;
          return (
            <section key={r.id} className="rounded-xl border bg-card p-5 shadow-sm" data-testid={`ronda-${r.numero}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">
                      Ronda {r.numero} · {r.nombre}
                    </h2>
                    <Badge
                      variant={estado === "abierta" ? "default" : estado === "cerrada" ? "secondary" : "outline"}
                      data-testid={`estado-ronda-${r.numero}`}
                    >
                      {ETIQUETA[estado]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pasan las mejores {r.top_n} ·{" "}
                    <span data-testid={`propuestas-ronda-${r.numero}`}>
                      {r.propuestas} propuesta{r.propuestas === 1 ? "" : "s"}
                    </span>{" "}
                    ·{" "}
                    <span className={cn(estado !== "pendiente" && "font-medium text-foreground")} data-testid={`avance-ronda-${r.numero}`}>
                      {r.enviados} de {total} enviaron
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {estado !== "pendiente" && (
                    <Link
                      href={`/admin/rondas/${r.id}/resultados`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                      data-testid={`resultados-${r.numero}`}
                    >
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
