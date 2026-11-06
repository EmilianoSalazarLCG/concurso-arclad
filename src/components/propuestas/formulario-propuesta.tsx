"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  buscarDuplicados,
  guardarPropuesta,
  prepararSubidaLogo,
} from "@/app/admin/(panel)/propuestas/nueva/acciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PosibleDuplicado } from "@/lib/datos/propuestas";
import { formatearFolio } from "@/lib/datos/tipos";
import { createClient } from "@/lib/supabase/client";
import {
  CAMPOS_VACIOS,
  LIMITES,
  claveNormalizada,
  limpiarCampos,
  validarArchivoLogo,
  validarCampos,
  type CampoPropuesta,
  type CamposPropuesta,
  type ErroresPropuesta,
} from "@/lib/validacion/propuesta";
import { cn } from "@/lib/utils";
import { Autocompletar } from "./autocompletar";
import { TarjetaPropuesta } from "./tarjeta-propuesta";
import { ZonaLogo, type LogoSeleccionado } from "./zona-logo";

type Modo = "lista" | "otra";
const ORDEN_FOCO: (CampoPropuesta | "logo")[] = [
  "participante_nombre",
  "area",
  "ciudad",
  "nombre_propuesto",
  "logo",
  "significado",
  "notas_internas",
];

function sinError(e: ErroresPropuesta, campo: keyof ErroresPropuesta): ErroresPropuesta {
  const copia = { ...e };
  delete copia[campo];
  return copia;
}

function agregarOpcion(opciones: string[], valor: string) {
  const k = claveNormalizada(valor);
  if (!k || opciones.some((o) => claveNormalizada(o) === k)) return opciones;
  return [...opciones, valor].sort((a, b) => a.localeCompare(b, "es-MX"));
}

export function FormularioPropuesta({ areas, ciudades }: { areas: string[]; ciudades: string[] }) {
  const router = useRouter();
  const [campos, setCampos] = useState<CamposPropuesta>(CAMPOS_VACIOS);
  const [logo, setLogo] = useState<LogoSeleccionado | null>(null);
  const [errores, setErrores] = useState<ErroresPropuesta>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<Modo | null>(null);
  const [duplicados, setDuplicados] = useState<PosibleDuplicado[]>([]);
  const [opcionesArea, setOpcionesArea] = useState(areas);
  const [opcionesCiudad, setOpcionesCiudad] = useState(ciudades);
  const [esMac, setEsMac] = useState(true);

  const refs = useRef<Partial<Record<CampoPropuesta | "logo", HTMLElement | null>>>({});
  const enCurso = useRef(false);
  const consultaDuplicados = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- solo se conoce en el navegador
    setEsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  const hayCambios = Object.values(campos).some((v) => v.trim()) || logo !== null;

  // Aviso al salir de la página con datos sin guardar.
  useEffect(() => {
    if (!hayCambios) return;
    const h = (e: BeforeUnloadEvent) => {
      if (!enCurso.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hayCambios]);

  // Posibles duplicados mientras se escribe (con pausa de 400 ms).
  const { participante_nombre, nombre_propuesto } = campos;
  useEffect(() => {
    const id = ++consultaDuplicados.current;
    const nombre = nombre_propuesto.trim();
    const persona = participante_nombre.trim();
    if (nombre.length < 3 && persona.length < 3) {
      const t = setTimeout(() => id === consultaDuplicados.current && setDuplicados([]), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(async () => {
      const r = await buscarDuplicados(persona, nombre);
      if (id === consultaDuplicados.current) setDuplicados(r);
    }, 400);
    return () => clearTimeout(t);
  }, [participante_nombre, nombre_propuesto]);

  function cambiar(campo: CampoPropuesta, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    if (errores[campo]) setErrores((e) => sinError(e, campo));
  }

  function cambiarLogo(nuevo: LogoSeleccionado | null) {
    setLogo((anterior) => {
      if (anterior && anterior.url !== nuevo?.url) URL.revokeObjectURL(anterior.url);
      return nuevo;
    });
    if (nuevo && errores.logo) setErrores((e) => sinError(e, "logo"));
  }

  function enfocarPrimerError(e: ErroresPropuesta) {
    const primero = ORDEN_FOCO.find((c) => e[c]);
    if (primero) refs.current[primero]?.focus();
  }

  function reiniciar() {
    cambiarLogo(null);
    setCampos(CAMPOS_VACIOS);
    setErrores({});
    setErrorGeneral(null);
    setDuplicados([]);
    requestAnimationFrame(() => refs.current.participante_nombre?.focus());
  }

  async function guardar(modo: Modo) {
    if (enCurso.current) return;

    // 1) Validación en el navegador.
    const limpio = limpiarCampos(campos);
    const e: ErroresPropuesta = validarCampos(limpio);
    const errLogo = validarArchivoLogo(logo && { tipo: logo.archivo.type, tamano: logo.archivo.size });
    if (errLogo) e.logo = errLogo;
    setErrores(e);
    if (Object.keys(e).length) {
      setErrorGeneral("Revisa los campos marcados.");
      enfocarPrimerError(e);
      return;
    }

    enCurso.current = true;
    setGuardando(modo);
    setErrorGeneral(null);
    try {
      // 2) Subida del logo directo a Storage con URL firmada por el servidor.
      const subida = await prepararSubidaLogo(logo!.archivo.type, logo!.archivo.size);
      if (!subida.ok) throw new Error(subida.error);
      const { error: errSubida } = await createClient()
        .storage.from("logos")
        .uploadToSignedUrl(subida.data.ruta, subida.data.token, logo!.archivo, {
          contentType: logo!.archivo.type,
        });
      if (errSubida) throw new Error(`No se pudo subir el logo: ${errSubida.message}`);

      // 3) Guardado (el servidor valida todo de nuevo).
      const r = await guardarPropuesta(limpio, subida.data.ruta);
      if (!r.ok) throw new Error(r.error);

      toast.success(`Propuesta ${r.data.folio} guardada`);
      setOpcionesArea((o) => agregarOpcion(o, limpio.area));
      setOpcionesCiudad((o) => agregarOpcion(o, limpio.ciudad));

      if (modo === "lista") {
        router.push("/admin/propuestas");
        return; // se mantiene "guardando" hasta salir de la página
      }
      reiniciar();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo guardar.";
      setErrorGeneral(`${mensaje} Tus datos siguen en el formulario.`);
      toast.error(mensaje);
    }
    enCurso.current = false;
    setGuardando(null);
  }

  function errorDe(campo: CampoPropuesta | "logo") {
    return errores[campo] ? `${campo}-error` : undefined;
  }

  const atajo = esMac ? "⌘" : "Ctrl";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void guardar("lista");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void guardar(e.shiftKey ? "otra" : "lista");
        }
      }}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="participante_nombre" etiqueta="Nombre de la persona" error={errores.participante_nombre} className="sm:col-span-2">
            <Input
              id="participante_nombre"
              ref={(el) => {
                refs.current.participante_nombre = el;
              }}
              autoFocus
              autoComplete="off"
              value={campos.participante_nombre}
              maxLength={LIMITES.participante_nombre}
              onChange={(e) => cambiar("participante_nombre", e.target.value)}
              aria-invalid={Boolean(errores.participante_nombre) || undefined}
              aria-describedby={errorDe("participante_nombre")}
            />
          </Campo>

          <Campo id="area" etiqueta="Área" error={errores.area}>
            <Autocompletar
              id="area"
              inputRef={(el) => {
                refs.current.area = el;
              }}
              valor={campos.area}
              onCambio={(v) => cambiar("area", v)}
              opciones={opcionesArea}
              maxLength={LIMITES.area}
              invalido={Boolean(errores.area)}
              descritoPor={errorDe("area")}
            />
          </Campo>

          <Campo id="ciudad" etiqueta="Ciudad" error={errores.ciudad}>
            <Autocompletar
              id="ciudad"
              inputRef={(el) => {
                refs.current.ciudad = el;
              }}
              valor={campos.ciudad}
              onCambio={(v) => cambiar("ciudad", v)}
              opciones={opcionesCiudad}
              maxLength={LIMITES.ciudad}
              invalido={Boolean(errores.ciudad)}
              descritoPor={errorDe("ciudad")}
            />
          </Campo>

          <Campo id="nombre_propuesto" etiqueta="Nombre propuesto para el proyecto" error={errores.nombre_propuesto} className="sm:col-span-2">
            <Input
              id="nombre_propuesto"
              ref={(el) => {
                refs.current.nombre_propuesto = el;
              }}
              autoComplete="off"
              value={campos.nombre_propuesto}
              maxLength={LIMITES.nombre_propuesto}
              onChange={(e) => cambiar("nombre_propuesto", e.target.value)}
              aria-invalid={Boolean(errores.nombre_propuesto) || undefined}
              aria-describedby={cn(errorDe("nombre_propuesto"), duplicados.length > 0 && "aviso-duplicados") || undefined}
            />
            {duplicados.length > 0 && <AvisoDuplicados duplicados={duplicados} />}
          </Campo>
        </div>

        <Campo id="logo" etiqueta="Logo" etiquetaComoTexto>
          <ZonaLogo
            id="logo"
            zonaRef={(el) => {
              refs.current.logo = el;
            }}
            valor={logo}
            onCambio={cambiarLogo}
            error={errores.logo}
            descritoPor={errorDe("logo")}
          />
        </Campo>

        <Campo
          id="significado"
          etiqueta="Significado"
          ayuda="Por qué ese nombre y ese logo."
          error={errores.significado}
          contador={`${campos.significado.length}/${LIMITES.significado}`}
        >
          <Textarea
            id="significado"
            ref={(el) => {
              refs.current.significado = el;
            }}
            rows={6}
            value={campos.significado}
            maxLength={LIMITES.significado}
            onChange={(e) => cambiar("significado", e.target.value)}
            aria-invalid={Boolean(errores.significado) || undefined}
            aria-describedby={errorDe("significado")}
          />
        </Campo>

        <Campo
          id="notas_internas"
          etiqueta="Notas internas"
          opcional
          ayuda="Solo las ven los administradores."
          error={errores.notas_internas}
        >
          <Textarea
            id="notas_internas"
            ref={(el) => {
              refs.current.notas_internas = el;
            }}
            rows={3}
            value={campos.notas_internas}
            maxLength={LIMITES.notas_internas}
            onChange={(e) => cambiar("notas_internas", e.target.value)}
            aria-invalid={Boolean(errores.notas_internas) || undefined}
            aria-describedby={errorDe("notas_internas")}
          />
        </Campo>

        {errorGeneral && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="error-general">
            {errorGeneral}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Cancelar
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" variant="outline" className="h-10" disabled={guardando !== null}>
              {guardando === "lista" && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Guardar
              <kbd className="ml-1 hidden text-xs text-muted-foreground sm:inline">{atajo}↵</kbd>
            </Button>
            <Button type="button" className="h-10" disabled={guardando !== null} onClick={() => void guardar("otra")}>
              {guardando === "otra" && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Guardar y capturar otra
              <kbd className="ml-1 hidden text-xs opacity-75 sm:inline">⇧{atajo}↵</kbd>
            </Button>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">Vista previa en la galería</p>
        <TarjetaPropuesta
          vistaPrevia
          datos={{
            nombrePropuesto: campos.nombre_propuesto.trim(),
            significado: campos.significado.trim(),
            participante: campos.participante_nombre.trim(),
            area: campos.area.trim(),
            ciudad: campos.ciudad.trim(),
            logoUrl: logo?.url,
          }}
        />
      </aside>
    </form>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  opcional,
  contador,
  etiquetaComoTexto,
  className,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  opcional?: boolean;
  contador?: string;
  etiquetaComoTexto?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        {etiquetaComoTexto ? (
          <span className="text-sm font-medium">{etiqueta}</span>
        ) : (
          <Label htmlFor={id}>
            {etiqueta}
            {opcional && <span className="font-normal text-muted-foreground">(opcional)</span>}
          </Label>
        )}
        {contador && <span className="text-xs text-muted-foreground tabular-nums">{contador}</span>}
      </div>
      {ayuda && <p className="-mt-1 text-xs text-muted-foreground">{ayuda}</p>}
      {children}
      {error && id !== "logo" && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {error && id === "logo" && <span id="logo-error" className="sr-only">{error}</span>}
    </div>
  );
}

function AvisoDuplicados({ duplicados }: { duplicados: PosibleDuplicado[] }) {
  return (
    <div
      id="aviso-duplicados"
      role="status"
      data-testid="aviso-duplicados"
      className="mt-2 rounded-lg border border-advertencia/40 bg-advertencia-fondo px-3 py-2.5 text-sm text-advertencia-foreground"
    >
      <p className="flex items-center gap-1.5 font-medium">
        <AlertTriangleIcon className="size-4 shrink-0" />
        Posibles duplicados (puedes guardar de todos modos):
      </p>
      <ul className="mt-1.5 space-y-1">
        {duplicados.map((d) => (
          <li key={d.id}>
            <span className="font-mono">Folio {formatearFolio(d.folio)}</span> · «{d.nombre_propuesto}» — propuesta de{" "}
            {d.participante_nombre}
            {d.motivo === "mismo_participante" && " (misma persona)"}
            {d.estado === "descartada" && " · descartada"}
          </li>
        ))}
      </ul>
    </div>
  );
}
