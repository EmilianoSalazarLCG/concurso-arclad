import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { EncabezadoPagina } from "@/components/admin/encabezado-pagina";
import { EstadoVacio } from "@/components/estado-vacio";
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
export const metadata = { title: "Propuestas · Concurso Identidad" };

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
    <div className="space-y-7">
      <EncabezadoPagina
        antetitulo="Historial completo · solo administradores"
        titulo="Propuestas"
        descripcion="Busca, filtra, edita y exporta. Las descartadas se conservan con su etiqueta."
        acciones={
          <Link href="/admin/propuestas/nueva" className={buttonVariants({ size: "lg" })}>
            <PlusIcon data-icon="inline-start" />
            Capturar propuesta
          </Link>
        }
      />

      <dl className="grid grid-cols-3 gap-3 sm:max-w-xl" data-testid="contadores">
        {(
          [
            ["Activas", contadores.activas, "text-primary"],
            ["Descartadas", contadores.descartadas, "text-destructive"],
            ["Total", contadores.activas + contadores.descartadas, "text-foreground"],
          ] as const
        ).map(([etiqueta, n, color], i) => (
          <div key={etiqueta} className="aparecer rounded-xl border bg-card px-4 py-3.5 shadow-xs" style={{ "--i": i } as React.CSSProperties}>
            <dt className="text-xs font-semibold text-muted-foreground">{etiqueta}</dt>
            <dd className={cn("mt-1 font-heading text-3xl leading-none font-semibold cifras", color)} data-testid={`contador-${etiqueta.toLowerCase()}`}>
              {n}
            </dd>
          </div>
        ))}
      </dl>

      <BarraFiltros key={filtros.q} filtros={filtros} areas={areas} ciudades={ciudades} />

      <p className="text-sm text-muted-foreground cifras" data-testid="resumen-resultados">
        {total === 0 ? "Sin resultados con estos filtros." : `Mostrando ${desde}–${hasta} de ${total}`}
      </p>

      {filas.length > 0 ? (
        <ListaPropuestas filas={filas} logos={logos} vistaInicial={vista} cookieVista={cookieVista} />
      ) : (
        <EstadoVacio
          titulo={contadores.activas + contadores.descartadas === 0 ? "Aún no hay propuestas" : "Nada coincide con tu búsqueda"}
          accion={
            contadores.activas + contadores.descartadas === 0 ? (
              <Link href="/admin/propuestas/nueva" className={buttonVariants()}>
                <PlusIcon data-icon="inline-start" /> Capturar la primera
              </Link>
            ) : undefined
          }
        >
          {contadores.activas + contadores.descartadas === 0
            ? "Cuando captures la primera propuesta aparecerá aquí."
            : "Prueba con otro término o quita algunos filtros."}
        </EstadoVacio>
      )}

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
