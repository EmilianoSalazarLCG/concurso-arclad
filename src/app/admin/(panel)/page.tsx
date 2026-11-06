import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/datos/auth";
import { contarPropuestas } from "@/lib/datos/propuestas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel · Concurso identidad" };

export default async function PanelPage() {
  const admin = await exigirAdmin();
  const { activas, descartadas } = await contarPropuestas();
  const primerNombre = admin.nombre.split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Hola, {primerNombre}</h1>
        <p className="mt-1 text-muted-foreground">Captura y administra las propuestas del concurso.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Propuestas activas capturadas</p>
          <p className="mt-2 font-heading text-5xl font-semibold text-primary tabular-nums" data-testid="contador-activas">
            {activas}
          </p>
          {descartadas > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {descartadas} descartada{descartadas === 1 ? "" : "s"} (no cuentan)
            </p>
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <div>
            <p className="font-heading text-lg font-semibold">Capturar propuesta</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pega el logo con ⌘V, completa los datos y guarda.
            </p>
          </div>
          <Link href="/admin/propuestas/nueva" className={buttonVariants({ className: "h-9 self-start" })}>
            <PlusIcon data-icon="inline-start" />
            Nueva propuesta
          </Link>
        </div>
      </div>
    </div>
  );
}
