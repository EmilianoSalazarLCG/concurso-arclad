"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileSpreadsheetIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ESTADOS_FILTRO,
  FILTROS_POR_DEFECTO,
  ORDENES,
  filtrosAQuery,
  type FiltrosPropuestas,
} from "@/lib/validacion/filtros";
import { cn } from "@/lib/utils";
import { BotonZipLogos } from "./boton-zip-logos";

const claseSelect =
  "h-9 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

export function BarraFiltros({
  filtros,
  areas,
  ciudades,
}: {
  filtros: FiltrosPropuestas;
  areas: string[];
  ciudades: string[];
}) {
  const router = useRouter();
  const ruta = usePathname();
  const [cargando, iniciar] = useTransition();
  const [texto, setTexto] = useState(filtros.q);
  const ultimoQ = useRef(filtros.q);

  function aplicar(cambios: Partial<FiltrosPropuestas>) {
    const q = filtrosAQuery(filtros, { ...cambios, pagina: 1 });
    iniciar(() => router.replace(q ? `${ruta}?${q}` : ruta, { scroll: false }));
  }

  // Búsqueda con pausa de 300 ms mientras se escribe.
  useEffect(() => {
    if (texto === ultimoQ.current) return;
    const t = setTimeout(() => {
      ultimoQ.current = texto;
      aplicar({ q: texto });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona al texto
  }, [texto]);

  const query = filtrosAQuery(filtros, { pagina: 1 });
  const hayFiltros =
    filtros.q || filtros.area || filtros.ciudad || filtros.estado !== FILTROS_POR_DEFECTO.estado;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar por folio, nombre propuesto o participante"
            placeholder="Buscar por folio, nombre propuesto o participante…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="h-9 pl-8"
            data-testid="buscar"
          />
        </div>
        <select
          aria-label="Estado"
          className={claseSelect}
          value={filtros.estado}
          onChange={(e) => aplicar({ estado: e.target.value as FiltrosPropuestas["estado"] })}
          data-testid="filtro-estado"
        >
          {Object.entries(ESTADOS_FILTRO).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Área"
          className={claseSelect}
          value={filtros.area}
          onChange={(e) => aplicar({ area: e.target.value })}
          data-testid="filtro-area"
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          aria-label="Ciudad"
          className={claseSelect}
          value={filtros.ciudad}
          onChange={(e) => aplicar({ ciudad: e.target.value })}
          data-testid="filtro-ciudad"
        >
          <option value="">Todas las ciudades</option>
          {ciudades.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenar por"
          className={claseSelect}
          value={filtros.orden}
          onChange={(e) => aplicar({ orden: e.target.value as FiltrosPropuestas["orden"] })}
          data-testid="orden"
        >
          {Object.entries(ORDENES).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        {cargando && <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Cargando" />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setTexto("");
                ultimoQ.current = "";
                iniciar(() => router.replace(ruta, { scroll: false }));
              }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" /> Quitar filtros
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/propuestas/exportar${query ? `?${query}` : ""}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            data-testid="exportar-excel"
          >
            <FileSpreadsheetIcon data-icon="inline-start" />
            Exportar a Excel
          </a>
          <BotonZipLogos query={query} />
        </div>
      </div>
    </div>
  );
}
