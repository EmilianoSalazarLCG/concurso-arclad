"use client";

import { CheckIcon, LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Copia el link corto de votación para pegarlo en correos, Teams o WhatsApp. */
export function CopiarLink({ url, compacto = false }: { url: string; compacto?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Respaldo para navegadores sin permiso de portapapeles.
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    toast.success("Link copiado", { description: url });
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copiar}
      data-testid="copiar-link"
      title={url}
      aria-label="Copiar link de votación"
      className={cn(compacto && "max-2xl:size-8 max-2xl:px-0")}
    >
      {copiado ? <CheckIcon data-icon="inline-start" className="text-exito" /> : <LinkIcon data-icon="inline-start" />}
      <span className={cn(compacto && "hidden 2xl:inline")}>{copiado ? "Copiado" : "Copiar link de votación"}</span>
    </Button>
  );
}
