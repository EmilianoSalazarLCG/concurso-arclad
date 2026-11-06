"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Vuelve a pedir la página al servidor cada `segundos` (resultados en vivo). */
export function AutoRefrescar({ segundos = 10 }: { segundos?: number }) {
  const router = useRouter();
  const [hora, setHora] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      router.refresh();
      setHora(new Date().toLocaleTimeString("es-MX"));
    }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="en-vivo">
      <span className="size-2 animate-pulse rounded-full bg-primary" /> En vivo · se actualiza cada {segundos} s
      {hora && ` · ${hora}`}
    </span>
  );
}
