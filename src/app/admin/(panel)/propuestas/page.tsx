import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/datos/auth";
import { listarPropuestas } from "@/lib/datos/propuestas";
import { formatearFolio } from "@/lib/datos/tipos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propuestas · Concurso ARclad" };

const fecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

/** Lista simple. La lista completa (filtros, edición, galería) se construye en la Fase 4. */
export default async function PropuestasPage() {
  await exigirAdmin();
  const propuestas = await listarPropuestas();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Propuestas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {propuestas.length} capturada{propuestas.length === 1 ? "" : "s"}. La vista completa llega en la siguiente fase.
          </p>
        </div>
        <Link href="/admin/propuestas/nueva" className={buttonVariants({ className: "h-9" })}>
          <PlusIcon data-icon="inline-start" />
          Capturar propuesta
        </Link>
      </div>

      {propuestas.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          Aún no hay propuestas capturadas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Nombre propuesto</th>
                <th className="px-4 py-3 font-medium">Persona</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Área · Ciudad</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Capturada</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {propuestas.map((p) => (
                <tr key={p.id} data-testid="fila-propuesta">
                  <td className="px-4 py-3 font-mono tabular-nums">{formatearFolio(p.folio)}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre_propuesto}</td>
                  <td className="px-4 py-3">{p.participante_nombre}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {p.area} · {p.ciudad}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {fecha.format(new Date(p.created_at))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.estado === "activa" ? "secondary" : "outline"}>
                      {p.estado === "activa" ? "Activa" : "Descartada"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
