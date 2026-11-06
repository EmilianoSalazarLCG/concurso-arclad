"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  CloudOffIcon,
  GaugeIcon,
  LayoutGridIcon,
  Loader2Icon,
  LockIcon,
  Maximize2Icon,
  SendIcon,
  XIcon,
} from "lucide-react";
import {
  cargarVotacion,
  consultarEstadoVotacion,
  enviarVoto,
  guardarCalificacion,
} from "@/app/votar/acciones";
import { Logotipo, Simbolo } from "@/components/marca/logotipo";
import { PatronGeometrico } from "@/components/marca/patron";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ESCALA } from "@/config/votacion";
import type { DatosVotacion, EstadoVotacion } from "@/lib/datos/votacion";
import { cn } from "@/lib/utils";

type Votante = { id: string; nombre: string };
type Mapa = Record<string, Record<string, number>>;
type Fase = "inicio" | "elegir" | "cargando" | "calificar" | "revisar" | "enviado" | "estado" | "cerrada-durante" | "error";
type EstadoGuardado = "listo" | "guardando" | "guardado" | "reintentando";
type Pendiente = { p: string; c: string; v: number };

const RENOVAR_IMAGENES_MS = 50 * 60 * 1000;
const f3 = (n: number) => String(n).padStart(3, "0");
const fechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

// ------------------------------------------------------------------ almacenamiento local seguro
function leer<T>(clave: string, respaldo: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? respaldo : (JSON.parse(v) as T);
  } catch {
    return respaldo;
  }
}
function escribir(clave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento local: el guardado en el servidor sigue funcionando */
  }
}
const CLAVE_VOTANTE = "votacion-votante";
const clavePendientes = (v: string, r: string) => `votacion-pendientes-${v}-${r}`;
const clavePosicion = (v: string, r: string) => `votacion-posicion-${v}-${r}`;

export function Votacion({ votantes, estadoInicial }: { votantes: Votante[]; estadoInicial: EstadoVotacion }) {
  const [fase, setFase] = useState<Fase>("inicio");
  const [estado, setEstado] = useState<EstadoVotacion>(estadoInicial);
  const [votante, setVotante] = useState<Votante | null>(null);
  const [datos, setDatos] = useState<DatosVotacion | null>(null);
  const [cal, setCal] = useState<Mapa>({});
  const [indice, setIndice] = useState(0);
  const [guardado, setGuardado] = useState<EstadoGuardado>("listo");
  const [enviadoAt, setEnviadoAt] = useState<string | null>(null);
  const [cambiosSinEnviar, setCambiosSinEnviar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [indiceAbierto, setIndiceAbierto] = useState(false);
  const [logoGrande, setLogoGrande] = useState(false);
  const [verMas, setVerMas] = useState(false);

  const renovadoEn = useRef(0);
  // ------------------------------------------------------------------ guardado automático con reintentos
  const cola = useRef(new Map<string, Pendiente>());
  const procesando = useRef(false);
  const espera = useRef(0);
  const reintento = useRef<ReturnType<typeof setTimeout>>(undefined);
  const contexto = useRef<{ votante: string; ronda: string } | null>(null);
  useEffect(() => {
    contexto.current = votante && datos ? { votante: votante.id, ronda: datos.ronda.id } : null;
  }, [votante, datos]);

  const persistirCola = useCallback(() => {
    const ctx = contexto.current;
    if (ctx) escribir(clavePendientes(ctx.votante, ctx.ronda), cola.current.size ? [...cola.current.values()] : null);
  }, []);

  const procesarCola = useCallback(async () => {
    if (procesando.current) return;
    procesando.current = true;
    clearTimeout(reintento.current);
    try {
      while (cola.current.size > 0) {
        const ctx = contexto.current;
        if (!ctx) break;
        const [clave, item] = cola.current.entries().next().value as [string, Pendiente];
        setGuardado("guardando");
        let r: Awaited<ReturnType<typeof guardarCalificacion>>;
        try {
          r = await guardarCalificacion(ctx.votante, ctx.ronda, item.p, item.c, item.v);
        } catch {
          r = { ok: false, error: "Sin conexión", cerrada: false };
        }
        if (r.ok) {
          if (cola.current.get(clave)?.v === item.v) cola.current.delete(clave);
          persistirCola();
          espera.current = 0;
          continue;
        }
        if (r.cerrada) {
          setFase("cerrada-durante");
          return;
        }
        // Error de conexión u otro: reintenta con espera creciente sin perder nada.
        setGuardado("reintentando");
        espera.current = Math.min(espera.current ? espera.current * 2 : 2000, 15000);
        reintento.current = setTimeout(() => void procesarCola(), espera.current);
        return;
      }
      setGuardado("guardado");
    } finally {
      procesando.current = false;
    }
  }, [persistirCola]);

  // ------------------------------------------------------------------ carga
  const cargar = useCallback(
    async (v: Votante, opciones: { silencioso?: boolean } = {}) => {
      if (!opciones.silencioso) setFase("cargando");
      const r = await cargarVotacion(v.id);
      if (r.tipo === "estado") {
        setEstado(r.estado);
        setFase("estado");
        return;
      }
      if (r.tipo === "error") {
        if (opciones.silencioso) return;
        setError(r.error);
        setFase("error");
        return;
      }
      const d = r.datos;
      if (opciones.silencioso) {
        // Solo se renuevan las URLs firmadas de los logos.
        setDatos((prev) =>
          prev && prev.ronda.id === d.ronda.id
            ? { ...prev, propuestas: prev.propuestas.map((p) => ({ ...p, logoUrl: d.propuestas.find((x) => x.id === p.id)?.logoUrl ?? p.logoUrl })) }
            : prev,
        );
        renovadoEn.current = Date.now();
        return;
      }
      // Avance del servidor + lo que quedó pendiente en este dispositivo.
      const pendientes = leer<Pendiente[]>(clavePendientes(v.id, d.ronda.id), []);
      const mezcla: Mapa = structuredClone(d.calificaciones);
      for (const x of pendientes) (mezcla[x.p] ??= {})[x.c] = x.v;
      cola.current = new Map(pendientes.map((x) => [`${x.p}|${x.c}`, x]));

      const completa = (pid: string) => d.criterios.every((c) => mezcla[pid]?.[c.id]);
      const guardada = leer<string | null>(clavePosicion(v.id, d.ronda.id), null);
      const primeraIncompleta = d.propuestas.findIndex((p) => !completa(p.id));
      const enPosicion = guardada ? d.propuestas.findIndex((p) => p.id === guardada) : -1;

      contexto.current = { votante: v.id, ronda: d.ronda.id };
      setDatos(d);
      setCal(mezcla);
      setEnviadoAt(d.enviadoAt);
      setCambiosSinEnviar(d.cambiosSinEnviar || (Boolean(d.enviadoAt) && pendientes.length > 0));
      setIndice(enPosicion >= 0 ? enPosicion : Math.max(0, primeraIncompleta));
      renovadoEn.current = Date.now();
      setFase(d.enviadoAt && !d.cambiosSinEnviar && pendientes.length === 0 ? "enviado" : "calificar");
      if (pendientes.length) void procesarCola();
    },
    [procesarCola],
  );

  useEffect(() => {
    const guardadoId = leer<string | null>(CLAVE_VOTANTE, null);
    const v = votantes.find((x) => x.id === guardadoId) ?? null;
    /* eslint-disable react-hooks/set-state-in-effect -- el votante elegido solo existe en el navegador */
    if (estadoInicial.tipo !== "abierta") setFase("estado");
    else if (v) {
      setVotante(v);
      void cargar(v);
    } else setFase("elegir");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [votantes, estadoInicial, cargar]);

  function elegir(v: Votante) {
    escribir(CLAVE_VOTANTE, v.id);
    setVotante(v);
    void cargar(v);
  }

  function cambiarVotante() {
    escribir(CLAVE_VOTANTE, null);
    setVotante(null);
    setDatos(null);
    setCal({});
    cola.current.clear();
    contexto.current = null;
    setFase(estado.tipo === "abierta" ? "elegir" : "estado");
  }

  useEffect(() => {
    const alConectar = () => void procesarCola();
    window.addEventListener("online", alConectar);
    return () => window.removeEventListener("online", alConectar);
  }, [procesarCola]);

  function calificar(propuestaId: string, criterioId: string, valor: number) {
    if (fase !== "calificar") return;
    setCal((m) => ({ ...m, [propuestaId]: { ...m[propuestaId], [criterioId]: valor } }));
    if (enviadoAt) setCambiosSinEnviar(true);
    cola.current.set(`${propuestaId}|${criterioId}`, { p: propuestaId, c: criterioId, v: valor });
    persistirCola();
    void procesarCola();
  }

  // ------------------------------------------------------------------ vigilancia: ronda cerrada e imágenes
  const enVotacion = fase === "calificar" || fase === "revisar" || fase === "enviado";
  useEffect(() => {
    if (!enVotacion || !datos || !votante) return;
    const t = setInterval(async () => {
      const e = await consultarEstadoVotacion();
      if (e && (e.tipo !== "abierta" || e.ronda.id !== datos.ronda.id)) {
        setEstado(e);
        setFase((f) => (f === "enviado" ? "estado" : "cerrada-durante"));
      }
      if (Date.now() - renovadoEn.current > RENOVAR_IMAGENES_MS) void cargar(votante, { silencioso: true });
    }, 30_000);
    return () => clearInterval(t);
  }, [enVotacion, datos, votante, cargar]);

  const ultimoReintentoImg = useRef(0);
  function alFallarImagen() {
    if (!votante || Date.now() - ultimoReintentoImg.current < 60_000) return;
    ultimoReintentoImg.current = Date.now();
    void cargar(votante, { silencioso: true });
  }

  // ------------------------------------------------------------------ derivados
  const propuestas = useMemo(() => datos?.propuestas ?? [], [datos]);
  const criterios = useMemo(() => datos?.criterios ?? [], [datos]);
  const total = propuestas.length * criterios.length;
  const hechas = propuestas.reduce((s, p) => s + criterios.filter((c) => cal[p.id]?.[c.id]).length, 0);
  const completa = (pid: string) => criterios.every((c) => cal[pid]?.[c.id]);
  const incompletas = propuestas.filter((p) => !completa(p.id));
  const todoCompleto = propuestas.length > 0 && incompletas.length === 0;
  const actual = propuestas[indice];

  function irA(i: number) {
    if (!propuestas.length) return;
    const n = Math.max(0, Math.min(propuestas.length - 1, i));
    setIndice(n);
    setVerMas(false);
    setFase("calificar");
    setIndiceAbierto(false);
    if (votante && datos) escribir(clavePosicion(votante.id, datos.ronda.id), propuestas[n].id);
    window.scrollTo({ top: 0 });
  }

  async function enviar() {
    if (!votante || !datos || !todoCompleto) return;
    setEnviando(true);
    setError(null);
    await procesarCola();
    if (cola.current.size > 0) {
      setEnviando(false);
      setError("Aún hay calificaciones sin guardar. Revisa tu conexión e intenta de nuevo.");
      return;
    }
    const r = await enviarVoto(votante.id, datos.ronda.id);
    setEnviando(false);
    if (!r.ok) {
      if (r.cerrada) setFase("cerrada-durante");
      else setError(r.error);
      return;
    }
    setEnviadoAt(r.data.enviadoAt);
    setCambiosSinEnviar(false);
    setFase("enviado");
    window.scrollTo({ top: 0 });
  }

  // ------------------------------------------------------------------ teclado y gesto de deslizar
  const alTeclear = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setLogoGrande(false);
      setIndiceAbierto(false);
      return;
    }
    if (fase !== "calificar" || logoGrande || indiceAbierto || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") irA(indice + 1);
    if (e.key === "ArrowLeft") irA(indice - 1);
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => alTeclear(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const toque = useRef<{ x: number; y: number } | null>(null);
  const gestos = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      toque.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const inicio = toque.current;
      toque.current = null;
      if (!inicio) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - inicio.x;
      const dy = t.clientY - inicio.y;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) irA(indice + (dx < 0 ? 1 : -1));
    },
  };

  // ------------------------------------------------------------------ pantallas
  if (fase === "inicio" || fase === "cargando") {
    return (
      <Pantalla>
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6" data-testid="cargando" aria-busy="true" aria-label="Cargando">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="grid gap-6 pt-4 lg:grid-cols-2">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </Pantalla>
    );
  }

  if (fase === "estado") return <PantallaEstado estado={estado} />;

  if (fase === "error") {
    return (
      <Pantalla>
        <Mensaje icono={<IconoCirculo tono="error"><CloudOffIcon className="size-9" /></IconoCirculo>} titulo="No se pudo cargar la votación">
          <p>{error}</p>
          <Button className="mt-4 h-11 text-primary-foreground" onClick={() => votante && cargar(votante)}>
            Intentar de nuevo
          </Button>
        </Mensaje>
      </Pantalla>
    );
  }

  if (fase === "elegir" || !votante || !datos) {
    return (
      <Pantalla>
        <section className="tema-oscuro relative isolate overflow-hidden bg-background px-4 pt-8 pb-28 text-foreground sm:pt-12 sm:pb-36">
          <PatronGeometrico className="-z-10 text-foreground/[0.08]" />
          <div className="absolute -top-24 -right-24 -z-10 size-80 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="mx-auto max-w-3xl aparecer">
            <Logotipo tamano="sm" />
            <p className="mt-10 text-xs font-semibold tracking-[0.22em] text-oro uppercase">Votación de gerentes</p>
            <h1 className="mt-3 text-4xl leading-[1.05] font-semibold sm:text-6xl">
              Califica las <em className="font-medium text-primary">propuestas</em>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Del 1 al 5 en cuatro criterios. No verás quién propuso cada nombre. Tu avance se guarda solo y puedes corregir hasta que cierre la votación.
            </p>
          </div>
        </section>
        <div className="relative z-10 mx-auto -mt-20 w-full max-w-3xl px-4 pb-16 sm:-mt-24">
          <div className="rounded-2xl border bg-card p-5 shadow-lg sm:p-7">
            <h2 className="text-2xl font-semibold">¿Quién eres?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Elige tu nombre para empezar.</p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2" data-testid="lista-votantes">
              {votantes.map((v, i) => (
                <li key={v.id} className="aparecer" style={{ "--i": i } as React.CSSProperties}>
                  <button
                    onClick={() => elegir(v)}
                    className="group flex min-h-16 w-full items-center gap-3 rounded-xl border bg-background px-3.5 text-left text-base font-semibold transition-[border-color,background-color,box-shadow,transform] duration-200 hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.99]"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      {v.nombre.split(" ").slice(0, 2).map((x) => x[0]).join("")}
                    </span>
                    {v.nombre}
                    <ChevronRightIcon aria-hidden className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Pantalla>
    );
  }

  const encabezado = (
    <header className="sticky top-0 z-30 border-b bg-encabezado/90 shadow-xs backdrop-blur-md">
      <div className="mx-auto max-w-6xl space-y-2.5 px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <Simbolo className="size-7" />
          <p className="mr-auto truncate font-semibold text-foreground" data-testid="ronda-actual">
            Ronda {datos.ronda.numero} de {datos.totalRondas} · {propuestas.length} propuestas
          </p>
          <IndicadorGuardado estado={guardado} />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={hechas} aria-valuemin={0} aria-valuemax={total}>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${total ? (hechas / total) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-semibold cifras" data-testid="progreso">
            {hechas} de {total} calificaciones
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ol className="flex flex-1 flex-wrap gap-1" aria-label="Propuestas" data-testid="indicadores">
            {propuestas.map((p, i) => (
              <li key={p.id}>
                <button
                  onClick={() => irA(i)}
                  aria-label={`Propuesta ${i + 1}${completa(p.id) ? ", completa" : ", incompleta"}`}
                  aria-current={fase === "calificar" && i === indice ? "step" : undefined}
                  data-completa={completa(p.id)}
                  className={cn(
                    "block h-2.5 rounded-full border transition-all duration-200",
                    fase === "calificar" && i === indice ? "w-6" : "w-2.5",
                    completa(p.id) ? "border-primary bg-primary" : "border-muted-foreground/40 bg-card",
                    fase === "calificar" && i === indice && !completa(p.id) && "border-foreground bg-foreground/80",
                  )}
                />
              </li>
            ))}
          </ol>
          <Button variant="ghost" size="sm" onClick={() => setIndiceAbierto(true)} data-testid="abrir-indice">
            <LayoutGridIcon data-icon="inline-start" /> Índice
          </Button>
        </div>
      </div>
    </header>
  );

  if (fase === "cerrada-durante") {
    return (
      <Pantalla>
        <Mensaje icono={<IconoCirculo><LockIcon className="size-9" /></IconoCirculo>} titulo="La votación se cerró" testid="cerrada-durante">
          <p>Ya no se pueden hacer cambios.</p>
          <p className="mt-2">
            {enviadoAt
              ? `Tu voto enviado el ${fechaHora.format(new Date(enviadoAt))} sí cuenta.`
              : "No alcanzaste a enviar tu voto, así que tus calificaciones no cuentan en esta ronda."}
          </p>
        </Mensaje>
      </Pantalla>
    );
  }

  if (fase === "enviado") {
    return (
      <Pantalla>
        <Mensaje icono={<CheckAnimado />} titulo={`Gracias, ${votante.nombre.split(" ")[0]}`} testid="enviado">
          <p className="text-lg leading-relaxed text-foreground">Tu calificación quedó registrada. Los resultados se muestran al cierre de la votación.</p>
          {enviadoAt && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground">
              <CheckCircle2Icon className="size-4 text-primary" /> Enviado el {fechaHora.format(new Date(enviadoAt))}
            </p>
          )}
          <div />
          <Button variant="outline" size="lg" className="mt-7 text-foreground" onClick={() => irA(0)} data-testid="corregir">
            Corregir mis calificaciones
          </Button>
          <p className="mt-6 text-sm">
            ¿No eres {votante.nombre}?{" "}
            <button className="underline underline-offset-2" onClick={cambiarVotante}>
              Cambiar
            </button>
          </p>
        </Mensaje>
      </Pantalla>
    );
  }

  if (fase === "revisar") {
    return (
      <Pantalla>
        {encabezado}
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 aparecer" data-testid="revisar">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Último paso</p>
          <h1 className="mt-2 text-4xl font-semibold">Enviar mi voto</h1>
          <p className="mt-2 text-muted-foreground">
            Calificaste {propuestas.length - incompletas.length} de {propuestas.length} propuestas.
          </p>
          {incompletas.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-advertencia/30 bg-advertencia-fondo p-5 text-advertencia-foreground" data-testid="faltantes">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangleIcon className="size-5" /> Te falta calificar:
              </p>
              <ul className="mt-3 space-y-2">
                {incompletas.map((p) => {
                  const i = propuestas.indexOf(p);
                  const faltan = criterios.filter((c) => !cal[p.id]?.[c.id]).length;
                  return (
                    <li key={p.id}>
                      <button className="text-left underline underline-offset-2" onClick={() => irA(i)} data-testid="ir-faltante">
                        Propuesta {i + 1} · {p.nombre_propuesto} ({faltan} criterio{faltan === 1 ? "" : "s"})
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="mt-6 flex items-center gap-2.5 rounded-2xl border border-primary/25 bg-accent px-5 py-4 font-semibold text-accent-foreground">
              <CheckIcon className="size-5" /> Calificaste todo. Ya puedes enviar.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive-fondo px-3.5 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" className="h-12" onClick={() => irA(indice)}>
              <ChevronLeftIcon data-icon="inline-start" /> Seguir calificando
            </Button>
            <Button className="h-12 px-6 text-base" disabled={!todoCompleto || enviando} onClick={enviar} data-testid="enviar">
              {enviando ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <SendIcon data-icon="inline-start" />}
              Enviar mi voto
            </Button>
          </div>
        </main>
      </Pantalla>
    );
  }

  // ------------------------------------------------------------------ calificar
  return (
    <Pantalla>
      {encabezado}

      {cambiosSinEnviar && (
        <div className="border-b border-advertencia/30 bg-advertencia-fondo text-advertencia-foreground" data-testid="cambios-sin-enviar">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
            <AlertTriangleIcon className="size-4" />
            <span className="flex-1">Tienes cambios sin enviar. Tu voto anterior sigue contando hasta que vuelvas a enviar.</span>
            <button className="font-medium underline underline-offset-2" onClick={() => setFase("revisar")}>
              Enviar de nuevo
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-36" {...gestos} data-testid="calificar">
        <div className="mb-5 flex gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm shadow-xs">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden>
            <GaugeIcon className="size-4" />
          </span>
          <div>
            <p className="font-semibold">¿Qué tanto cumple cada propuesta con cada criterio? Califica de 1 a 5</p>
            <p className="mt-0.5 text-muted-foreground">{ESCALA.map((e) => `${e.valor} ${e.etiqueta}`).join(" · ")}</p>
          </div>
        </div>

        {actual && (
          <div key={actual.id} className="grid gap-6 aparecer lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
            <section className="space-y-5 lg:sticky lg:top-40">
              <button
                onClick={() => setLogoGrande(true)}
                className="group relative flex aspect-[4/3] w-full cursor-zoom-in items-center justify-center rounded-2xl border bg-lienzo-logo p-8 shadow-sm transition-shadow hover:shadow-md"
                aria-label="Ver logo en pantalla completa"
                data-testid="logo"
              >
                {actual.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                  <img
                    key={actual.id}
                    src={actual.logoUrl}
                    alt={`Logo de ${actual.nombre_propuesto}`}
                    onError={alFallarImagen}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
                <span className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground opacity-80 shadow-xs transition-opacity group-hover:opacity-100" aria-hidden>
                  <Maximize2Icon className="size-4" />
                </span>
              </button>
              <div>
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  <span className="rounded-full border border-border bg-card px-2.5 py-0.5 tracking-normal normal-case cifras">Folio {f3(actual.folio)}</span>
                  Propuesta {indice + 1} de {propuestas.length}
                </p>
                <h1 className="mt-3 text-4xl leading-[1.05] font-semibold break-words sm:text-5xl" data-testid="nombre">
                  {actual.nombre_propuesto}
                </h1>
                <p
                  className={cn("mt-4 text-base leading-relaxed break-words whitespace-pre-line text-foreground/80 sm:text-lg", !verMas && "line-clamp-4")}
                  data-testid="significado"
                >
                  {actual.significado}
                </p>
                {actual.significado.length > 220 && (
                  <button className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setVerMas((v) => !v)}>
                    {verMas ? "Ver menos" : "Ver más"}
                  </button>
                )}
                {actual.autor && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {actual.autor.participante} · {actual.autor.area} · {actual.autor.ciudad}
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4" aria-label="Criterios">
              {criterios.map((c) => {
                const valor = cal[actual.id]?.[c.id];
                return (
                  <fieldset
                    key={c.id}
                    className={cn("rounded-2xl border bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-200 sm:p-5", valor && "border-primary/30")}
                    data-testid="criterio"
                  >
                    <legend className="sr-only">{c.nombre}</legend>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-lg leading-tight font-semibold">{c.nombre}</p>
                        {c.descripcion && <p className="mt-1 text-sm text-muted-foreground">{c.descripcion}</p>}
                      </div>
                      {valor ? (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="size-3.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <CircleIcon className="size-6 shrink-0 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label={c.nombre}>
                      {ESCALA.map((e) => (
                        <button
                          key={e.valor}
                          role="radio"
                          aria-checked={valor === e.valor}
                          aria-label={`${e.valor}: ${e.etiqueta}`}
                          onClick={() => {
                            navigator.vibrate?.(8);
                            calificar(actual.id, c.id, e.valor);
                          }}
                          data-valor={e.valor}
                          className={cn(
                            "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-0.5 py-2 transition-[background-color,border-color,box-shadow,transform] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.94]",
                            valor === e.valor
                              ? "-translate-y-0.5 border-primary bg-primary text-primary-foreground shadow-md"
                              : valor && e.valor < valor
                                ? "border-primary/25 bg-accent text-accent-foreground hover:border-primary/50"
                                : "bg-background hover:border-primary/50 hover:bg-accent/50",
                          )}
                        >
                          <span className="font-heading text-2xl leading-none font-semibold cifras">{e.valor}</span>
                          <span className={cn("text-center text-[10px] leading-tight sm:text-xs", valor === e.valor ? "opacity-90" : "text-muted-foreground")}>
                            {e.etiqueta}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </section>
          </div>
        )}
      </main>

      {/* Navegación inferior fija */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-encabezado/90 shadow-[0_-8px_24px_rgb(var(--sombra)/0.06)] backdrop-blur-md" aria-label="Navegación entre propuestas">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Button variant="outline" className="h-12 flex-1 sm:flex-none" onClick={() => irA(indice - 1)} disabled={indice === 0} data-testid="anterior">
            <ChevronLeftIcon data-icon="inline-start" /> Anterior
          </Button>
          <span className="hidden flex-1 text-center text-sm text-muted-foreground sm:block">
            {completa(actual?.id ?? "") ? "Propuesta completa" : "Califica los 4 criterios"} · usa ← → o desliza
          </span>
          {indice < propuestas.length - 1 ? (
            <Button className="h-12 flex-1 sm:flex-none" onClick={() => irA(indice + 1)} data-testid="siguiente">
              Siguiente <ChevronRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button className="h-12 flex-1 sm:flex-none" onClick={() => setFase("revisar")} data-testid="ir-enviar">
              <SendIcon data-icon="inline-start" /> {todoCompleto ? "Enviar mi voto" : "Revisar y enviar"}
            </Button>
          )}
        </div>
        {todoCompleto && indice < propuestas.length - 1 && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <Button variant="secondary" className="h-10 w-full" onClick={() => setFase("revisar")} data-testid="listo-enviar">
              <SendIcon data-icon="inline-start" /> Ya calificaste todo: enviar mi voto
            </Button>
          </div>
        )}
      </nav>

      {/* Índice */}
      {indiceAbierto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/45 backdrop-blur-[3px] sm:items-center" onClick={() => setIndiceAbierto(false)}>
          <div
            className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:max-w-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Índice de propuestas"
            data-testid="indice"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Propuestas</h2>
              <Button variant="ghost" size="icon" onClick={() => setIndiceAbierto(false)} aria-label="Cerrar">
                <XIcon />
              </Button>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              {incompletas.length === 0 ? "Todas completas." : `Faltan ${incompletas.length} de ${propuestas.length}.`}
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {propuestas.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => irA(i)}
                    className={cn("flex w-full items-center gap-3 rounded-xl border p-2 text-left hover:bg-accent/40", i === indice && "border-primary")}
                    data-testid="item-indice"
                    data-completa={completa(p.id)}
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-lienzo-logo">
                      {p.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada
                        <img src={p.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {i + 1}. {p.nombre_propuesto}
                      </span>
                      <span className={cn("text-xs", completa(p.id) ? "text-primary" : "text-muted-foreground")}>
                        {completa(p.id) ? "Completa" : `${criterios.filter((c) => cal[p.id]?.[c.id]).length} de ${criterios.length} criterios`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Logo en pantalla completa */}
      {logoGrande && actual?.logoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/95 p-4" onClick={() => setLogoGrande(false)} data-testid="logo-grande">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada */}
          <img src={actual.logoUrl} alt={`Logo de ${actual.nombre_propuesto}`} className="max-h-full max-w-full rounded-lg bg-white object-contain p-4" />
          <Button variant="secondary" size="icon" className="absolute top-4 right-4" aria-label="Cerrar">
            <XIcon />
          </Button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {guardado === "reintentando" ? "Sin conexión, reintentando" : ""}
      </p>
      <div className="fixed right-4 bottom-24 z-20 text-xs text-muted-foreground sm:hidden">
        ¿No eres {votante.nombre.split(" ")[0]}?{" "}
        <button className="underline" onClick={cambiarVotante}>
          Cambiar
        </button>
      </div>
      <div className="mx-auto hidden w-full max-w-6xl px-4 pb-28 text-sm text-muted-foreground sm:block">
        ¿No eres {votante.nombre}?{" "}
        <button className="underline underline-offset-2" onClick={cambiarVotante} data-testid="cambiar-votante">
          Cambiar
        </button>
      </div>
    </Pantalla>
  );
}

// ------------------------------------------------------------------ piezas
function Pantalla({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}

function Marca() {
  return <Logotipo tamano="sm" className="justify-center" />;
}

/** Palomita que se dibuja (animación sobria) dentro de un círculo esmeralda con destellos dorados. */
function CheckAnimado() {
  return (
    <span className="relative flex size-24 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full bg-primary/10 [animation-iteration-count:2]" aria-hidden />
      <svg viewBox="0 0 96 96" className="relative size-24" aria-hidden>
        <circle cx="48" cy="48" r="44" className="fill-accent stroke-primary" strokeWidth="3" />
        <path
          d="M30 49 l12 12 l24 -26"
          fill="none"
          className="stroke-primary [stroke-dasharray:60] [stroke-dashoffset:60] motion-safe:animate-[trazo_650ms_300ms_ease-out_forwards] motion-reduce:[stroke-dashoffset:0]"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="84" cy="16" r="4" className="fill-oro" />
        <circle cx="12" cy="76" r="3" className="fill-oro" />
        <circle cx="90" cy="70" r="2.5" className="fill-oro/70" />
      </svg>
    </span>
  );
}

function Mensaje({ icono, titulo, testid, children }: { icono: React.ReactNode; titulo: string; testid?: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-14" data-testid={testid}>
      <div className="w-full max-w-lg rounded-3xl border bg-card px-6 py-10 text-center shadow-lg aparecer sm:px-10">
        <div className="flex justify-center">{icono}</div>
        <div className="mt-6">
          <Marca />
        </div>
        <h1 className="mt-4 text-4xl font-semibold">{titulo}</h1>
        <div className="mt-3 text-muted-foreground">{children}</div>
      </div>
    </main>
  );
}

function PantallaEstado({ estado }: { estado: EstadoVotacion }) {
  const recargar = () => window.location.reload();
  if (estado.tipo === "cerrada") {
    return (
      <Pantalla>
        <Mensaje icono={<IconoCirculo><LockIcon className="size-9" /></IconoCirculo>} titulo="La votación ya cerró" testid="estado-cerrada">
          <p>La votación de la Ronda {estado.ronda.numero} ya cerró. Gracias por participar.</p>
          {estado.hayMasRondas && <p className="mt-2">Te avisaremos cuando abra la siguiente ronda.</p>}
          <Button variant="outline" className="mt-6 h-11 text-foreground" onClick={recargar}>
            Volver a revisar
          </Button>
        </Mensaje>
      </Pantalla>
    );
  }
  return (
    <Pantalla>
      <Mensaje icono={<IconoCirculo><LockIcon className="size-9" /></IconoCirculo>} titulo="La votación aún no está abierta" testid="estado-sin-abrir">
        <p>Vuelve a este link cuando te avisen que la votación está abierta.</p>
        <Button variant="outline" className="mt-6 h-11" onClick={recargar}>
          Volver a revisar
        </Button>
      </Mensaje>
    </Pantalla>
  );
}

function IconoCirculo({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "error" }) {
  return (
    <span
      className={cn(
        "flex size-20 items-center justify-center rounded-full",
        tono === "error" ? "bg-destructive-fondo text-destructive" : "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  if (estado === "listo") return null;
  return (
    <span
      className={cn("flex shrink-0 items-center gap-1 text-xs", estado === "reintentando" ? "text-advertencia-foreground" : "text-muted-foreground")}
      data-testid="indicador-guardado"
      data-estado={estado}
    >
      {estado === "guardando" && <Loader2Icon className="size-3 animate-spin" />}
      {estado === "guardado" && <CheckIcon className="size-3" />}
      {estado === "reintentando" && <CloudOffIcon className="size-3" />}
      {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : "Sin conexión · reintentando (no se pierde nada)"}
    </span>
  );
}
