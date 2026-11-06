import { LimpiezaHuerfanos } from "@/components/admin/limpieza-huerfanos";
import { Badge } from "@/components/ui/badge";
import { exigirAdmin } from "@/lib/datos/auth";
import { calcularHuerfanos } from "@/lib/datos/huerfanos";
import { verificarConexion } from "@/lib/datos/sistema";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mantenimiento · Concurso identidad" };

export default async function MantenimientoPage() {
  await exigirAdmin();
  const [{ elegibles, recientes }, conexion] = await Promise.all([calcularHuerfanos(createAdminClient(), 24), verificarConexion()]);
  const bytes = elegibles.reduce((s, e) => s + e.tamano, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Mantenimiento</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tareas de limpieza del almacenamiento.</p>
      </div>

      <section className="max-w-2xl space-y-2 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Estado del sistema</h2>
        <div className="flex items-center gap-3 text-sm" data-testid="estado-conexion">
          <span className="text-muted-foreground">Conexión con la base de datos:</span>
          {conexion.ok ? (
            <Badge>Conexión OK</Badge>
          ) : (
            <>
              <Badge variant="destructive">Sin conexión</Badge>
              <span className="text-destructive">{conexion.error}</span>
            </>
          )}
        </div>
      </section>

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
