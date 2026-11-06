import { LimpiezaHuerfanos } from "@/components/admin/limpieza-huerfanos";
import { exigirAdmin } from "@/lib/datos/auth";
import { calcularHuerfanos } from "@/lib/datos/huerfanos";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mantenimiento · Concurso ARclad" };

export default async function MantenimientoPage() {
  await exigirAdmin();
  const { elegibles, recientes } = await calcularHuerfanos(createAdminClient(), 24);
  const bytes = elegibles.reduce((s, e) => s + e.tamano, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Mantenimiento</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tareas de limpieza del almacenamiento.</p>
      </div>

      <section className="max-w-2xl space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Logos huérfanos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Archivos en Storage que no pertenecen a ninguna propuesta (por ejemplo, una captura que se abandonó a medias).
            Solo se borran los que tienen más de 24 horas, para no tocar capturas en curso.
          </p>
        </div>
        <LimpiezaHuerfanos cantidad={elegibles.length} bytes={bytes} recientes={recientes} />
      </section>
    </div>
  );
}
