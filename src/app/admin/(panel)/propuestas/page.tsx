import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { BarraFiltros } from "@/components/propuestas/barra-filtros";
import { ListaPropuestas, type Vista } from "@/components/propuestas/lista-propuestas";
import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/datos/auth";
import { listarPropuestasGestion } from "@/lib/datos/gestion";
import { urlsFirmadasLogos } from "@/lib/datos/logos";
import { contarPropuestas, valoresAutocompletar } from "@/lib/datos/propuestas";
import { POR_PAGINA, filtrosAQuery, leerFiltros } from "@/lib/validacion/filtros";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propuestas · Concurso ARclad" };

export default async function PropuestasPage({ searchParams }: PageProps<"/admin/propuestas">) {
  const admin = await exigirAdmin();
  const filtros = leerFiltros(await searchParams);

  const [{ filas, total, paginas }, contadores, { areas, ciudades }, almacen] = await Promise.all([
    listarPropuestasGestion(filtros),
    contarPropuestas(),
    valoresAutocompletar(),
    cookies(),
  ]);
  const logos = await urlsFirmadasLogos(filas.map((p) => p.logo_path));

  const cookieVista = `vista-propuestas-${admin.user_id.slice(0, 8)}`;
  const vista: Vista = almacen.get(cookieVista)?.value === "tarjetas" ? "tarjetas" : "tabla";

  const pagina = Math.min(filtros.pagina, paginas);
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const enlacePagina = (n: number) => {
    const q = filtrosAQuery(filtros, { pagina: n });
    return q ? `/admin/propuestas?${q}` : "/admin/propuestas";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Propuestas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Historial completo (solo administradores).</p>
        </div>
        <Link href="/admin/propuestas/nueva" className={buttonVariants({ className: "h-9" })}>
          <PlusIcon data-icon="inline-start" />
          Capturar propuesta
        </Link>
      </div>

      <dl className="grid grid-cols-3 gap-3 sm:max-w-lg" data-testid="contadores">
        {(
          [
            ["Activas", contadores.activas, "text-primary"],
            ["Descartadas", contadores.descartadas, "text-destructive"],
            ["Total", contadores.activas + contadores.descartadas, "text-foreground"],
          ] as const
        ).map(([etiqueta, n, color]) => (
          <div key={etiqueta} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
            <dd className={cn("font-heading text-2xl font-semibold tabular-nums", color)} data-testid={`contador-${etiqueta.toLowerCase()}`}>
              {n}
            </dd>
          </div>
        ))}
      </dl>

      <BarraFiltros key={filtros.q} filtros={filtros} areas={areas} ciudades={ciudades} />

      <p className="text-sm text-muted-foreground" data-testid="resumen-resultados">
        {total === 0 ? "Sin resultados con estos filtros." : `Mostrando ${desde}–${hasta} de ${total}`}
      </p>

      {filas.length > 0 && <ListaPropuestas filas={filas} logos={logos} vistaInicial={vista} cookieVista={cookieVista} />}

      {paginas > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
          <Link
            href={enlacePagina(pagina - 1)}
            aria-disabled={pagina <= 1}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), pagina <= 1 && "pointer-events-none opacity-50")}
          >
            <ChevronLeftIcon data-icon="inline-start" /> Anterior
          </Link>
          <span className="text-sm text-muted-foreground">
            Página {pagina} de {paginas}
          </span>
          <Link
            href={enlacePagina(pagina + 1)}
            aria-disabled={pagina >= paginas}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), pagina >= paginas && "pointer-events-none opacity-50")}
          >
            Siguiente <ChevronRightIcon data-icon="inline-end" />
          </Link>
        </nav>
      )}
    </div>
  );
}
