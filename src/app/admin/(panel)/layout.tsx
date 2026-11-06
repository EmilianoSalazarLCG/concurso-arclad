import Link from "next/link";
import { LogOutIcon, PresentationIcon } from "lucide-react";
import { CopiarLink } from "@/components/admin/copiar-link";
import { Navegacion } from "@/components/admin/navegacion";
import { Button, buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/datos/auth";
import { linkVotacion } from "@/lib/link-votacion";
import { cerrarSesion } from "../acciones-sesion";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await exigirAdmin();
  const link = await linkVotacion();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-encabezado/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="font-heading text-lg font-semibold whitespace-nowrap">
            Concurso <span className="text-primary">identidad</span>
          </Link>
          <div className="hidden lg:block">
            <Navegacion />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <CopiarLink url={link.url} compacto />
            <Link
              href="/admin/reunion"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              data-testid="modo-reunion"
            >
              <PresentationIcon data-icon="inline-start" />
              Modo reunión
            </Link>
            <span className="hidden text-sm text-muted-foreground 2xl:inline" title={admin.correo}>
              {admin.nombre}
            </span>
            <form action={cerrarSesion}>
              <Button type="submit" variant="outline" size="sm">
                <LogOutIcon data-icon="inline-start" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
        <div className="overflow-x-auto border-t px-4 py-1.5 lg:hidden">
          <Navegacion />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
