"use client";

import { useId, useMemo, useState, type Ref } from "react";
import { Input } from "@/components/ui/input";
import { canonizar, claveNormalizada } from "@/lib/validacion/propuesta";
import { cn } from "@/lib/utils";

/**
 * Campo de texto con sugerencias de valores ya capturados.
 * Compara sin acentos ni mayúsculas y, al salir del campo, unifica el valor con
 * la grafía existente ("operaciones" → "Operaciones").
 */
export function Autocompletar({
  id,
  valor,
  onCambio,
  opciones,
  invalido,
  descritoPor,
  maxLength,
  inputRef,
}: {
  id: string;
  valor: string;
  onCambio: (v: string) => void;
  opciones: readonly string[];
  invalido?: boolean;
  descritoPor?: string;
  maxLength?: number;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const listaId = useId();
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);

  const sugerencias = useMemo(() => {
    const k = claveNormalizada(valor);
    return opciones.filter((o) => {
      const ko = claveNormalizada(o);
      return ko !== k && ko.includes(k);
    }).slice(0, 8);
  }, [valor, opciones]);

  const visible = abierto && sugerencias.length > 0;

  function elegir(o: string) {
    onCambio(o);
    setAbierto(false);
    setActivo(-1);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        value={valor}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listaId}
        aria-activedescendant={visible && activo >= 0 ? `${listaId}-${activo}` : undefined}
        aria-invalid={invalido || undefined}
        aria-describedby={descritoPor}
        onChange={(e) => {
          onCambio(e.target.value);
          setAbierto(true);
          setActivo(-1);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setAbierto(false);
          const canonico = canonizar(valor.replace(/\s+/g, " ").trim(), opciones);
          if (canonico !== valor) onCambio(canonico);
        }}
        onKeyDown={(e) => {
          if (!visible || e.metaKey || e.ctrlKey) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((i) => (i + 1) % sugerencias.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
          } else if (e.key === "Enter" && activo >= 0) {
            e.preventDefault();
            elegir(sugerencias[activo]);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
      />
      {visible && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md"
        >
          {sugerencias.map((o, i) => (
            <li
              key={o}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === activo}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1.5",
                i === activo ? "bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
              // mousedown (no click) para elegir antes de que el input pierda el foco
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(o);
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
