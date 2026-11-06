import Link from "next/link";
import { LogOutIcon, PresentationIcon } from "lucide-react";
import { CopiarLink } from "@/components/admin/copiar-link";
import { Navegacion } from "@/components/admin/navegacion";
import { Logotipo } from "@/components/marca/logotipo";
import { Button, buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/datos/auth";
import { linkVotacion } from "@/lib/link-votacion";
import { cn } from "@/lib/utils";
import { cerrarSesion } from "../acciones-sesion";

export const dynamic = "force-dynamic";

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await exigirAdmin();
  const link = await linkVotacion();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-encabezado/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 xl:gap-6">
          <Link href="/admin" className="shrink-0 rounded-lg" aria-label="Concurso Identidad · inicio">
            <Logotipo tamano="sm" className="[&>span:last-child]:text-base sm:[&>span:last-child]:text-lg" />
          </Link>
          <div className="hidden lg:block">
            <Navegacion />
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <CopiarLink url={link.url} compacto />
            <Link
              href="/admin/reunion"
              className={cn(buttonVariants({ variant: "tinta", size: "sm" }), "max-sm:size-8 max-sm:px-0")}
              data-testid="modo-reunion"
              aria-label="Modo reunión"
            >
              <PresentationIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Modo reunión</span>
            </Link>
            <span className="mx-1 hidden h-6 w-px bg-border lg:block" aria-hidden />
            <span className="hidden items-center gap-2 lg:flex" title={`${admin.nombre} · ${admin.correo}`}>
              <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground" aria-hidden>
                {iniciales(admin.nombre)}
              </span>
              <span className="max-w-40 truncate text-sm font-semibold max-xl:sr-only">{admin.nombre}</span>
            </span>
            <form action={cerrarSesion}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión" title="Cerrar sesión" className="max-2xl:size-8 max-2xl:px-0">
                <LogOutIcon data-icon="inline-start" />
                <span className="hidden 2xl:inline">Cerrar sesión</span>
              </Button>
            </form>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-border px-2 py-1.5 lg:hidden">
          <Navegacion />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:py-10">{children}</main>
      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:px-6">
          <span>Concurso Identidad · Panel de People &amp; Culture</span>
          <Link href="/admin/estilo" className="hover:text-foreground">
            Guía de estilo
          </Link>
        </div>
      </footer>
    </div>
  );
}
