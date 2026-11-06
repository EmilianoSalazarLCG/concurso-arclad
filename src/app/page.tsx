import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// Nunca cachear: la verificación debe ser en vivo en cada request.
export const dynamic = "force-dynamic";

type Resultado = { ok: true } | { ok: false; error: string };

async function verificarConexion(): Promise<Resultado> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, error: "Faltan variables de entorno de Supabase." };
  }

  try {
    // 1) El servicio responde (health check de Auth, sin caché).
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `Supabase respondió ${res.status}.` };

    // 2) El cliente SSR se construye y habla con Supabase usando la llave anon.
    const supabase = await createClient();
    const { error } = await supabase.storage.listBuckets();
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

export default async function Home() {
  const resultado = await verificarConexion();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Concurso identidad</CardTitle>
          <CardDescription>Estado del proyecto base</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Supabase:</span>
          {resultado.ok ? (
            <Badge>Conexión OK</Badge>
          ) : (
            <>
              <Badge variant="destructive">Sin conexión</Badge>
              <span className="text-sm text-destructive">{resultado.error}</span>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
