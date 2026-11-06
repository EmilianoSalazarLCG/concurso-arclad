"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  LayoutGridIcon,
  Loader2Icon,
  LogOutIcon,
  MaximizeIcon,
  MinimizeIcon,
  MoonIcon,
  BarChart3Icon,
  ShuffleIcon,
  SunIcon,
  TrophyIcon,
  VoteIcon,
} from "lucide-react";
import { cargarPropuestasReunion, consultarEstadoReunion } from "@/app/admin/reunion/acciones";
import { EstadoVacio } from "@/components/estado-vacio";
import { Logotipo } from "@/components/marca/logotipo";
import { Button } from "@/components/ui/button";
import type { EstadoReunion, PropuestaReunion, RondaReunion } from "@/lib/datos/reunion";
import { cn } from "@/lib/utils";
import { PanelVotacion } from "./panel-votacion";
import { VistaResultados } from "./resultados-reunion";
import { RevelarGanadores } from "./revelar-ganadores";

type Vista = { tipo: "galeria" } | { tipo: "detalle"; id: string } | { tipo: "votacion" } | { tipo: "resultados" } | { tipo: "revelar" };
type Orden = "folio" | "aleatorio";
type Tema = "claro" | "oscuro";

/** Las URLs firmadas duran 60 min; se renuevan a los 50. */
const RENOVAR_TRAS_MS = 50 * 60 * 1000;
const OCULTAR_CONTROLES_MS = 3000;

const folio3 = (n: number) => String(n).padStart(3, "0");

// ------------------------------------------------------------------ almacenamiento seguro
function leer(almacen: "session" | "local", clave: string): string | null {
  try {
    return (almacen === "session" ? sessionStorage : localStorage).getItem(clave);
  } catch {
    return null;
  }
}
function guardar(almacen: "session" | "local", clave: string, valor: string) {
  try {
    (almacen === "session" ? sessionStorage : localStorage).setItem(clave, valor);
  } catch {
    /* sin almacenamiento: la preferencia solo dura mientras la página esté abierta */
  }
}

function barajar(ids: string[]): string[] {
  const r = [...ids];
  const azar = new Uint32Array(r.length);
  crypto.getRandomValues(azar);
  for (let i = r.length - 1; i > 0; i--) {
    const j = azar[i] % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Orden aleatorio fijo por sesión y por fuente; agrega al final (barajadas) las propuestas nuevas. */
function ordenAleatorioPara(fuente: string, ids: string[], nuevo = false): string[] {
  const clave = `reunion-orden-${fuente}`;
  const actuales = new Set(ids);
  let guardado: string[] = [];
  if (!nuevo) {
    try {
      guardado = (JSON.parse(leer("session", clave) ?? "[]") as string[]).filter((id) => actuales.has(id));
    } catch {
      guardado = [];
    }
  }
  const faltan = ids.filter((id) => !guardado.includes(id));
  const orden = [...guardado, ...barajar(faltan)];
  guardar("session", clave, JSON.stringify(orden));
  return orden;
}

export function ModoReunion({
  propuestasIniciales,
  rondas,
  estadoInicial,
  urlVotar,
  linkCorto,
  qrSvg,
}: {
  propuestasIniciales: PropuestaReunion[];
  rondas: RondaReunion[];
  estadoInicial: EstadoReunion;
  urlVotar: string;
  linkCorto: string;
  qrSvg: string;
}) {
  const [fuente, setFuente] = useState("activas");
  const [propuestas, setPropuestas] = useState(propuestasIniciales);
  const cargadoEn = useRef(0);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("folio");
  const [ordenIds, setOrdenIds] = useState<string[]>([]);
  const [vista, setVista] = useState<Vista>({ tipo: "galeria" });
  const [mostrarAutor, setMostrarAutor] = useState(false);
  const [tema, setTema] = useState<Tema>("oscuro");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [controles, setControles] = useState(true);
  const [estadoR, setEstadoR] = useState<EstadoReunion>(estadoInicial);
  const ronda = estadoR.abierta;

  // Preferencias guardadas (solo existen en el navegador).
  useEffect(() => {
    cargadoEn.current = Date.now();
    /* eslint-disable react-hooks/set-state-in-effect -- preferencias que solo existen en el navegador */
    setMostrarAutor(leer("session", "reunion-autor") === "1");
    setOrden(leer("session", "reunion-orden") === "aleatorio" ? "aleatorio" : "folio");
    // Por defecto, fondo tinta (presentación ejecutiva); el tema claro queda como opción.
    setTema(leer("local", "reunion-tema") === "claro" ? "claro" : "oscuro");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ------------------------------------------------------------------ carga y renovación
  const solicitud = useRef(0);
  const recargar = useCallback(async (f: string, opciones: { silencioso?: boolean } = {}) => {
    const id = ++solicitud.current;
    if (!opciones.silencioso) setCargando(true);
    const r = await cargarPropuestasReunion(f);
    if (id !== solicitud.current) return;
    setCargando(false);
    if (!r.ok) {
      setAviso(r.error);
      return;
    }
    setAviso(null);
    setPropuestas(r.data);
    cargadoEn.current = Date.now();
  }, []);

  useEffect(() => {
    const revisar = () => {
      if (Date.now() - cargadoEn.current > RENOVAR_TRAS_MS) void recargar(fuente, { silencioso: true });
    };
    const intervalo = setInterval(revisar, 60_000);
    const alVolver = () => document.visibilityState === "visible" && revisar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [fuente, recargar]);

  // Si una imagen falla (p. ej. URL vencida), se renuevan las URLs una sola vez por minuto.
  const ultimoReintento = useRef(0);
  const alFallarImagen = useCallback(() => {
    if (Date.now() - ultimoReintento.current < 60_000) return;
    ultimoReintento.current = Date.now();
    void recargar(fuente, { silencioso: true });
  }, [fuente, recargar]);

  // ¿Ronda abierta, rondas cerradas, ganadores confirmados? (se consulta cada 20 s)
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await consultarEstadoReunion();
      if (r.ok) setEstadoR(r.data);
    }, 20_000);
    return () => clearInterval(t);
  }, []);

  function cambiarFuente(f: string) {
    setFuente(f);
    setVista({ tipo: "galeria" });
    void recargar(f);
  }

  // ------------------------------------------------------------------ orden
  const idsClave = propuestas.map((p) => p.id).join(",");
  useEffect(() => {
    if (orden !== "aleatorio") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el orden vive en sessionStorage
    setOrdenIds(ordenAleatorioPara(fuente, idsClave ? idsClave.split(",") : []));
  }, [orden, fuente, idsClave]);

  const lista = useMemo(() => {
    const porFolio = [...propuestas].sort((a, b) => a.folio - b.folio);
    if (orden === "folio") return porFolio;
    const pos = new Map(ordenIds.map((id, i) => [id, i]));
    return porFolio.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  }, [propuestas, orden, ordenIds]);

  function cambiarOrden(o: Orden) {
    setOrden(o);
    guardar("session", "reunion-orden", o);
  }

  function reordenar() {
    setOrdenIds(ordenAleatorioPara(fuente, propuestas.map((p) => p.id), true));
  }

  // ------------------------------------------------------------------ navegación
  const indice = vista.tipo === "detalle" ? lista.findIndex((p) => p.id === vista.id) : -1;
  const actual = indice >= 0 ? lista[indice] : null;
  useEffect(() => {
    // La propuesta abierta ya no está en la selección: regresa a la galería.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- corrección de estado derivado
    if (vista.tipo === "detalle" && indice < 0) setVista({ tipo: "galeria" });
  }, [vista, indice]);

  const mover = useCallback(
    (delta: number) => {
      if (indice < 0 || lista.length === 0) return;
      const siguiente = lista[(indice + delta + lista.length) % lista.length];
      setVista({ tipo: "detalle", id: siguiente.id });
    },
    [indice, lista],
  );

  // Precarga de la anterior y la siguiente.
  useEffect(() => {
    if (indice < 0 || lista.length < 2) return;
    for (const d of [-1, 1]) {
      const url = lista[(indice + d + lista.length) % lista.length].logoUrl;
      if (url) new Image().src = url;
    }
  }, [indice, lista]);

  function alternarAutor() {
    setMostrarAutor((v) => {
      guardar("session", "reunion-autor", v ? "0" : "1");
      return !v;
    });
  }

  function alternarTema() {
    setTema((t) => {
      const nuevo = t === "claro" ? "oscuro" : "claro";
      guardar("local", "reunion-tema", nuevo);
      return nuevo;
    });
  }

  // ------------------------------------------------------------------ pantalla completa
  const alternarPantallaCompleta = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => setAviso("El navegador no permitió la pantalla completa."));
  }, []);
  useEffect(() => {
    const h = () => setPantallaCompleta(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ------------------------------------------------------------------ controles que se ocultan
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sobreControles = useRef(false);
  const programarOcultar = useCallback(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      const enSelector = document.activeElement instanceof HTMLSelectElement;
      if (!sobreControles.current && !enSelector) setControles(false);
    }, OCULTAR_CONTROLES_MS);
  }, []);
  const mostrarControles = useCallback(() => {
    setControles(true);
    programarOcultar();
  }, [programarOcultar]);
  useEffect(() => {
    programarOcultar();
    const eventos = ["mousemove", "mousedown", "touchstart", "wheel"] as const;
    eventos.forEach((e) => window.addEventListener(e, mostrarControles, { passive: true }));
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, mostrarControles));
      clearTimeout(temporizador.current);
    };
  }, [mostrarControles, programarOcultar]);
  const propsControles = {
    onMouseEnter: () => (sobreControles.current = true),
    onMouseLeave: () => (sobreControles.current = false),
  };

  // ------------------------------------------------------------------ teclado
  const alTeclear = useEffectEvent((e: KeyboardEvent) => {
    const destino = e.target as HTMLElement | null;
    // Esc siempre regresa a la galería (aunque el foco esté en una casilla o selector).
    if (e.key === "Escape" && vista.tipo !== "galeria") {
      setVista({ tipo: "galeria" });
      return;
    }
    const escribiendo = destino?.closest("textarea, select, input:not([type=checkbox]):not([type=radio])");
    if (escribiendo || e.metaKey || e.ctrlKey || e.altKey) return;
    const tecla = e.key.toLowerCase();
    if (tecla === "f") {
      e.preventDefault();
      alternarPantallaCompleta();
    } else if (vista.tipo === "detalle" && e.key === "ArrowRight") {
      e.preventDefault();
      mover(1);
    } else if (vista.tipo === "detalle" && e.key === "ArrowLeft") {
      e.preventDefault();
      mover(-1);
    } else if (vista.tipo === "detalle" && tecla === "a") {
      alternarAutor();
    } else if (e.key === "Escape" && vista.tipo !== "galeria") {
      setVista({ tipo: "galeria" });
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => alTeclear(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ------------------------------------------------------------------ interfaz
  const claseControles = cn(
    "transition-opacity duration-300",
    controles ? "opacity-100" : "pointer-events-none opacity-0",
  );
  const contador = `${lista.length} propuesta${lista.length === 1 ? "" : "s"}`;
  const etiquetaFuente = (r: RondaReunion) => `Ronda ${r.numero} · ${r.nombre}`;

  const botonesGlobales = (
    <>
      <Button
        variant="outline"
        onClick={alternarTema}
        data-testid="tema"
        aria-label={tema === "claro" ? "Tema oscuro" : "Tema claro"}
        title={tema === "claro" ? "Tema oscuro" : "Tema claro"}
        className="max-2xl:size-9 max-2xl:px-0"
      >
        {tema === "claro" ? <MoonIcon data-icon="inline-start" /> : <SunIcon data-icon="inline-start" />}
        <span className="hidden 2xl:inline">{tema === "claro" ? "Oscuro" : "Claro"}</span>
      </Button>
      <Button
        variant="outline"
        onClick={alternarPantallaCompleta}
        data-testid="pantalla-completa"
        aria-label={pantallaCompleta ? "Salir de pantalla completa (F)" : "Pantalla completa (F)"}
        title={pantallaCompleta ? "Salir de pantalla completa (F)" : "Pantalla completa (F)"}
        className="max-2xl:size-9 max-2xl:px-0"
      >
        {pantallaCompleta ? <MinimizeIcon data-icon="inline-start" /> : <MaximizeIcon data-icon="inline-start" />}
        <span className="hidden 2xl:inline">{pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}</span>
        <kbd className="ml-1 hidden text-xs opacity-60 2xl:inline">F</kbd>
      </Button>
    </>
  );

  return (
    <div
      data-testid="reunion"
      data-tema={tema}
      className={cn(
        "flex min-h-dvh flex-col bg-background text-foreground",
        tema === "oscuro" && "tema-oscuro",
        !controles && "cursor-none",
      )}
    >
      {/* Barra superior */}
      <header
        {...propsControles}
        data-testid="controles"
        data-visibles={controles}
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-encabezado/85 px-6 py-3 backdrop-blur-md",
          claseControles,
        )}
      >
        {vista.tipo === "galeria" ? (
          <>
            <div className="mr-3 flex items-center gap-3">
              <Logotipo tamano="sm" />
              <span className="hidden rounded-full border border-border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase 2xl:inline">
                Modo reunión
              </span>
            </div>
            <select
              aria-label="Qué mostrar"
              value={fuente}
              onChange={(e) => cambiarFuente(e.target.value)}
              className="h-9 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm font-medium"
              data-testid="fuente"
            >
              <option value="activas">Todas las propuestas activas</option>
              {rondas.map((r) => (
                <option key={r.id} value={r.id}>
                  {etiquetaFuente(r)}
                </option>
              ))}
            </select>
            <div role="radiogroup" aria-label="Orden" className="inline-flex rounded-lg border bg-card p-1">
              {(["folio", "aleatorio"] as const).map((o) => (
                <button
                  key={o}
                  role="radio"
                  aria-checked={orden === o}
                  onClick={() => cambiarOrden(o)}
                  data-testid={`orden-${o}`}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-semibold transition-colors",
                    orden === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o === "folio" ? "Por folio" : "Aleatorio"}
                </button>
              ))}
            </div>
            {orden === "aleatorio" && (
              <Button variant="ghost" onClick={reordenar} data-testid="reordenar">
                <ShuffleIcon data-icon="inline-start" /> Reordenar
              </Button>
            )}
            {cargando && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setVista({ tipo: "votacion" })}
                disabled={!ronda}
                data-testid="boton-votacion"
              >
                <VoteIcon data-icon="inline-start" />
                {ronda ? "Votación" : "No hay votación abierta"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setVista({ tipo: "resultados" })}
                disabled={estadoR.cerradas.length === 0}
                data-testid="boton-resultados"
              >
                <BarChart3Icon data-icon="inline-start" /> Resultados
              </Button>
              {estadoR.ganadoresListos && (
                <Button variant="outline" onClick={() => setVista({ tipo: "revelar" })} data-testid="boton-revelar">
                  <TrophyIcon data-icon="inline-start" /> Revelar ganadores
                </Button>
              )}
              {botonesGlobales}
              <Link href="/admin" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:text-foreground">
                <LogOutIcon className="size-4" /> Salir
              </Link>
            </div>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setVista({ tipo: "galeria" })} data-testid="volver-galeria">
              <LayoutGridIcon data-icon="inline-start" /> Galería <kbd className="ml-1 text-xs opacity-60">Esc</kbd>
            </Button>
            <div className="ml-auto flex items-center gap-2">{botonesGlobales}</div>
          </>
        )}
      </header>

      {aviso && (
        <p role="alert" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-destructive px-4 py-2 text-sm text-white shadow">
          {aviso}
        </p>
      )}

      {/* Contenido */}
      {vista.tipo === "galeria" && (
        <main className="flex-1 px-6 pt-28 pb-12 sm:px-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <p className="font-heading text-5xl font-semibold cifras" data-testid="contador">
              {contador}
            </p>
            <p className="hidden text-sm text-muted-foreground md:block">Clic en una propuesta para verla en grande · F pantalla completa</p>
          </div>
          {lista.length === 0 ? (
            <EstadoVacio className="mx-auto max-w-xl" titulo="No hay propuestas en esta selección">
              Elige otra ronda o «Todas las propuestas activas».
            </EstadoVacio>
          ) : (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]" data-testid="galeria">
              {lista.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setVista({ tipo: "detalle", id: p.id })}
                  data-testid="tarjeta-reunion"
                  data-folio={p.folio}
                  style={{ "--i": i } as React.CSSProperties}
                  className="group aparecer overflow-hidden rounded-2xl border bg-card text-left shadow-md transition-[transform,box-shadow,border-color] duration-200 outline-none hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-ring/50"
                >
                  <div className="m-2 mb-0 flex aspect-[4/3] items-center justify-center rounded-xl bg-lienzo-logo p-8">
                    {p.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                      <img
                        src={p.logoUrl}
                        alt={`Logo de ${p.nombre_propuesto}`}
                        onError={alFallarImagen}
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-3 px-5 py-4">
                    <h2 className="text-3xl leading-tight font-semibold break-words">{p.nombre_propuesto}</h2>
                    <span className="shrink-0 text-sm font-semibold text-muted-foreground cifras">{folio3(p.folio)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      )}

      {vista.tipo === "detalle" && actual && (
        <main
          className="grid min-h-dvh flex-1 grid-cols-1 gap-10 px-8 pt-24 pb-32 lg:h-dvh lg:flex-none lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:px-14"
          data-testid="detalle"
        >
          <div key={actual.id} className="flex min-h-[40vh] animate-revelar items-center justify-center overflow-hidden rounded-3xl bg-lienzo-logo p-12 shadow-lg lg:h-full lg:min-h-0">
            {actual.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada
              <img
                key={actual.id}
                src={actual.logoUrl}
                alt={`Logo de ${actual.nombre_propuesto}`}
                onError={alFallarImagen}
                className="max-h-[60vh] max-w-full object-contain lg:max-h-full"
                data-testid="logo-detalle"
              />
            )}
          </div>
          <div key={`t-${actual.id}`} className="flex min-h-0 animate-revelar flex-col justify-center gap-6 [animation-delay:120ms]">
            <p className="text-lg font-semibold tracking-[0.2em] text-primary uppercase cifras" data-testid="folio-detalle">
              Folio {folio3(actual.folio)}
            </p>
            <h1 className="text-6xl leading-[1.02] font-semibold break-words xl:text-7xl" data-testid="nombre-detalle">
              {actual.nombre_propuesto}
            </h1>
            <p className="min-h-0 overflow-y-auto text-2xl leading-relaxed break-words whitespace-pre-line text-foreground/80 xl:text-[1.75rem]">
              {actual.significado}
            </p>
            {mostrarAutor && (
              <div className="animate-revelar border-t border-border pt-5 text-2xl" data-testid="autor">
                <p className="font-medium">{actual.participante_nombre}</p>
                <p className="mt-1 text-muted-foreground">
                  {actual.area} · {actual.ciudad}
                </p>
              </div>
            )}
          </div>

          <nav
            {...propsControles}
            aria-label="Navegación entre propuestas"
            className={cn(
              "fixed inset-x-0 bottom-6 z-30 mx-auto flex w-fit items-center gap-3 rounded-2xl border border-border bg-encabezado/90 p-2 shadow-lg backdrop-blur-md",
              claseControles,
            )}
          >
            <Button variant="outline" size="lg" onClick={() => mover(-1)} aria-label="Anterior" data-testid="anterior">
              <ChevronLeftIcon data-icon="inline-start" /> Anterior
            </Button>
            <span className="min-w-24 text-center font-heading text-xl font-semibold cifras" data-testid="posicion">
              {indice + 1} de {lista.length}
            </span>
            <Button variant="outline" size="lg" onClick={() => mover(1)} aria-label="Siguiente" data-testid="siguiente">
              Siguiente <ChevronRightIcon data-icon="inline-end" />
            </Button>
            <span className="mx-1 h-6 w-px bg-border" />
            <Button variant="ghost" size="lg" onClick={alternarAutor} data-testid="boton-autor">
              {mostrarAutor ? <EyeOffIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
              {mostrarAutor ? "Ocultar autor" : "Mostrar autor"} <kbd className="ml-1 text-xs opacity-60">A</kbd>
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setVista({ tipo: "galeria" })}>
              <ArrowLeftIcon data-icon="inline-start" /> Galería
            </Button>
          </nav>
        </main>
      )}

      {vista.tipo === "votacion" && <PanelVotacion urlVotar={urlVotar} linkCorto={linkCorto} qrSvg={qrSvg} />}
      {vista.tipo === "resultados" && <VistaResultados cerradas={estadoR.cerradas} />}
      {vista.tipo === "revelar" && <RevelarGanadores />}
    </div>
  );
}
