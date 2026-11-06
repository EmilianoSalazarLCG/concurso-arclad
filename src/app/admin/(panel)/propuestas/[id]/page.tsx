import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PencilIcon } from "lucide-react";
import { AccionesEstado } from "@/components/propuestas/acciones-estado";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/datos/auth";
import { obtenerPropuestaGestion, vecinosPorFolio } from "@/lib/datos/gestion";
import { urlFirmadaLogo } from "@/lib/datos/logos";
import { formatearFolio } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const fecha = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export async function generateMetadata({ params }: PageProps<"/admin/propuestas/[id]">) {
  await exigirAdmin();
  const p = await obtenerPropuestaGestion((await params).id);
  return { title: p ? `${formatearFolio(p.folio)} · ${p.nombre_propuesto} · Concurso Identidad` : "Propuesta" };
}

export default async function DetallePropuestaPage({ params }: PageProps<"/admin/propuestas/[id]">) {
  await exigirAdmin();
  const { id } = await params;
  const p = await obtenerPropuestaGestion(id);
  if (!p) notFound();

  const [logoUrl, { anterior, siguiente }] = await Promise.all([urlFirmadaLogo(p.logo_path), vecinosPorFolio(p.folio)]);
  const descartada = p.estado === "descartada";
  const bloqueo = p.rondas.find((r) => r.estado === "abierta" || r.estado === "cerrada");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/propuestas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> Propuestas
        </Link>
        <nav aria-label="Propuesta anterior y siguiente" className="flex gap-2">
          <Link
            href={anterior ? `/admin/propuestas/${anterior.id}` : "#"}
            aria-disabled={!anterior}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), !anterior && "pointer-events-none opacity-50")}
            data-testid="anterior"
          >
            <ChevronLeftIcon data-icon="inline-start" />
            {anterior ? `Folio ${formatearFolio(anterior.folio)}` : "Anterior"}
          </Link>
          <Link
            href={siguiente ? `/admin/propuestas/${siguiente.id}` : "#"}
            aria-disabled={!siguiente}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), !siguiente && "pointer-events-none opacity-50")}
            data-testid="siguiente"
          >
            {siguiente ? `Folio ${formatearFolio(siguiente.folio)}` : "Siguiente"}
            <ChevronRightIcon data-icon="inline-end" />
          </Link>
        </nav>
      </div>

      {descartada && (
        <div className="rounded-xl border border-destructive/25 bg-destructive-fondo px-5 py-4 text-sm" data-testid="aviso-descartada">
          <p className="font-medium text-destructive">Propuesta descartada</p>
          <p className="mt-0.5 text-muted-foreground">
            {p.descartada_at && `El ${fecha.format(new Date(p.descartada_at))}`}
            {p.descartada_por_nombre && ` por ${p.descartada_por_nombre}`}.
            {p.motivo_descarte ? ` Motivo: ${p.motivo_descarte}` : " Sin motivo registrado."}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
        <div className="space-y-3">
          <div className="flex aspect-square items-center justify-center rounded-2xl border bg-lienzo-logo p-10 shadow-sm">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada
              <img
                src={logoUrl}
                alt={`Logo de ${p.nombre_propuesto}`}
                className={cn("max-h-full max-w-full object-contain", descartada && "opacity-60 grayscale")}
                data-testid="logo-grande"
              />
            )}
          </div>
          <a
            href={`/admin/propuestas/${p.id}/logo`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            data-testid="descargar-logo"
          >
            <DownloadIcon data-icon="inline-start" />
            Descargar archivo original
          </a>
        </div>

        <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase cifras">Folio {formatearFolio(p.folio)}</p>
              <h1 className="mt-2 text-4xl font-semibold break-words" data-testid="nombre-propuesto">
                {p.nombre_propuesto}
              </h1>
            </div>
            {descartada ? <Badge variant="destructive">Descartada</Badge> : <Badge variant="exito">Activa</Badge>}
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <Dato etiqueta="Participante" valor={p.participante_nombre} />
            <Dato etiqueta="Área" valor={p.area} />
            <Dato etiqueta="Ciudad" valor={p.ciudad} />
          </dl>

          <div>
            <h2 className="font-sans text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Significado</h2>
            <p className="mt-2 text-base leading-relaxed break-words whitespace-pre-line text-foreground/85" data-testid="significado">
              {p.significado}
            </p>
          </div>

          <div className="rounded-xl border border-oro/30 bg-oro-suave/60 px-4 py-3.5">
            <h2 className="font-sans text-xs font-semibold tracking-[0.12em] text-oro-foreground uppercase">
              Notas internas <span className="normal-case tracking-normal">(solo admins)</span>
            </h2>
            <p className="mt-1 text-sm break-words whitespace-pre-line">
              {p.notas_internas || <span className="text-muted-foreground">Sin notas.</span>}
            </p>
          </div>

          <dl className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
            <Dato
              etiqueta="Capturada"
              valor={`${fecha.format(new Date(p.created_at))} · ${p.capturada_por_nombre ?? "admin eliminado"}`}
            />
            <Dato
              etiqueta="Última edición"
              valor={p.updated_by ? `${fecha.format(new Date(p.updated_at))} · ${p.editada_por_nombre ?? "admin eliminado"}` : "Sin ediciones"}
              testid="ultima-edicion"
            />
            <Dato
              etiqueta="Rondas"
              valor={
                p.rondas.length
                  ? p.rondas.map((r) => `Ronda ${r.numero} (${r.estado})${r.posicion_final ? ` · lugar ${r.posicion_final}` : ""}`).join(", ")
                  : "Aún no participa en rondas"
              }
            />
          </dl>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Link href={`/admin/propuestas/${p.id}/editar`} className={buttonVariants({ size: "sm" })} data-testid="editar">
              <PencilIcon data-icon="inline-start" />
              Editar
            </Link>
            <AccionesEstado
              id={p.id}
              folio={formatearFolio(p.folio)}
              estado={p.estado as "activa" | "descartada"}
              bloqueo={
                bloqueo ? `Está asignada a la ronda ${bloqueo.numero} «${bloqueo.nombre}» (${bloqueo.estado}).` : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, testid }: { etiqueta: string; valor: string; testid?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 font-medium break-words" data-testid={testid}>
        {valor}
      </dd>
    </div>
  );
}
