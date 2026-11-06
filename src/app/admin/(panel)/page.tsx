import Link from "next/link";
import { ArrowUpRightIcon, FileStackIcon, ListChecksIcon, PlusIcon, PresentationIcon, TrophyIcon, UsersIcon, VoteIcon } from "lucide-react";
import { Embudo } from "@/components/admin/embudo";
import { EncabezadoPagina, Metrica } from "@/components/admin/encabezado-pagina";
import { buttonVariants } from "@/components/ui/button";
import { totalVotantes } from "@/config/votantes";
import { exigirAdmin } from "@/lib/datos/auth";
import { contarPropuestas } from "@/lib/datos/propuestas";
import { resumenRondas } from "@/lib/datos/rondas";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel · Concurso Identidad" };

const hoy = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mexico_City" });

export default async function PanelPage() {
  const admin = await exigirAdmin();
  const [{ activas, descartadas }, rondas, total] = await Promise.all([contarPropuestas(), resumenRondas(), totalVotantes()]);
  const primerNombre = admin.nombre.split(" ")[0];
  const abierta = rondas.find((r) => r.estado === "abierta");
  const siguiente = rondas.find((r) => r.estado === "pendiente");
  const ultimaCerrada = [...rondas].reverse().find((r) => r.estado === "cerrada");
  const referencia = abierta ?? ultimaCerrada;
  const pct = referencia ? Math.round((referencia.enviados / Math.max(1, total)) * 100) : 0;

  const accesos = [
    { href: "/admin/propuestas/nueva", titulo: "Capturar propuesta", texto: "Pega el logo con ⌘V y completa los datos.", icono: PlusIcon },
    { href: "/admin/propuestas", titulo: "Propuestas", texto: "Historial, búsqueda, edición y exportación.", icono: FileStackIcon },
    { href: "/admin/rondas", titulo: "Rondas", texto: "Abrir, cerrar y pasar a la siguiente ronda.", icono: ListChecksIcon },
    { href: "/admin/reunion", titulo: "Modo reunión", texto: "Proyecta la galería, la votación y los ganadores.", icono: PresentationIcon },
  ];

  return (
    <div className="space-y-10">
      <EncabezadoPagina
        antetitulo={hoy.format(new Date())}
        titulo={
          <>
            Hola, <em className="font-medium text-primary">{primerNombre}</em>
          </>
        }
        descripcion="Así va el concurso. Captura propuestas, guía la votación y revela a los ganadores."
        acciones={
          <Link href="/admin/propuestas/nueva" className={buttonVariants({ size: "lg" })}>
            <PlusIcon data-icon="inline-start" /> Nueva propuesta
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metrica
          className="aparecer"
          etiqueta="Propuestas activas"
          cifra={activas}
          testid="contador-activas"
          tono="primario"
          icono={<FileStackIcon />}
          pie={descartadas > 0 ? `${descartadas} descartada${descartadas === 1 ? "" : "s"} (no cuentan)` : "Listas para la Ronda 1"}
        />
        <Metrica
          className="aparecer [--i:1]"
          etiqueta="Ronda actual"
          cifra={abierta ? `Ronda ${abierta.numero}` : siguiente ? "—" : "Final"}
          icono={<VoteIcon />}
          pie={
            abierta ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                <span className="size-2 animate-brillo rounded-full bg-primary" /> Votación abierta · {abierta.nombre}
              </span>
            ) : siguiente ? (
              `Siguiente: Ronda ${siguiente.numero} · ${siguiente.propuestas} propuesta${siguiente.propuestas === 1 ? "" : "s"}`
            ) : (
              "Las 3 rondas terminaron"
            )
          }
        />
        <Metrica
          className="aparecer [--i:2]"
          etiqueta="Avance de votación"
          cifra={
            <>
              {referencia?.enviados ?? 0}
              <span className="text-2xl text-muted-foreground"> / {total}</span>
            </>
          }
          icono={<UsersIcon />}
          pie={referencia ? `gerentes enviaron · Ronda ${referencia.numero}` : "Aún no hay votación"}
        >
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
        </Metrica>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">El embudo del concurso</h2>
            <p className="text-sm text-muted-foreground">De todas las propuestas a los 3 ganadores, en tres votaciones.</p>
          </div>
          <Link href="/admin/rondas" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Gestionar rondas <ArrowUpRightIcon data-icon="inline-end" />
          </Link>
        </div>
        <Embudo activas={activas} rondas={rondas} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accesos rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accesos.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(
                "group aparecer rounded-xl border bg-card p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <a.icono className="size-5" />
              </span>
              <p className="mt-4 font-heading text-lg font-semibold">{a.titulo}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.texto}</p>
            </Link>
          ))}
          <Link
            href="/admin/ganadores"
            className="group aparecer flex items-center gap-4 rounded-xl border border-oro/40 bg-oro-suave p-5 shadow-xs transition-[transform,box-shadow] duration-200 [--i:4] hover:-translate-y-0.5 hover:shadow-md sm:col-span-2 lg:col-span-4"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-oro text-tinta">
              <TrophyIcon className="size-5" />
            </span>
            <span>
              <span className="block font-heading text-lg font-semibold">Ganadores</span>
              <span className="text-sm text-oro-foreground">Confirma el Top 3 y descarga el paquete para la agencia.</span>
            </span>
            <ArrowUpRightIcon className="ml-auto size-5 text-oro-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
