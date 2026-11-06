import { AlertTriangleIcon, CheckIcon, PlusIcon, SearchIcon, TrophyIcon } from "lucide-react";
import { Embudo } from "@/components/admin/embudo";
import { EncabezadoPagina, Metrica } from "@/components/admin/encabezado-pagina";
import { EstadoVacio } from "@/components/estado-vacio";
import { Logotipo, Simbolo } from "@/components/marca/logotipo";
import { PatronGeometrico } from "@/components/marca/patron";
import { TarjetaPropuesta } from "@/components/propuestas/tarjeta-propuesta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { exigirAdmin } from "@/lib/datos/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guía de estilo · Concurso Identidad" };

/** Paleta: cada muestra usa la clase del token (no valores sueltos). */
const PALETA = [
  { nombre: "Tinta", token: "--tinta", clase: "bg-tinta", uso: "Títulos, texto, fondo del modo reunión" },
  { nombre: "Esmeralda", token: "--primary", clase: "bg-primary", uso: "Botones primarios, selección, progreso" },
  { nombre: "Esmeralda hover", token: "--primary-hover", clase: "bg-primary-hover", uso: "Hover de botones primarios" },
  { nombre: "Tinte esmeralda", token: "--accent", clase: "bg-accent", uso: "Fondos de selección y énfasis suave" },
  { nombre: "Marfil", token: "--background", clase: "bg-background", uso: "Fondo general" },
  { nombre: "Superficie", token: "--card", clase: "bg-card", uso: "Tarjetas y paneles" },
  { nombre: "Arena", token: "--border", clase: "bg-border", uso: "Bordes y divisores" },
  { nombre: "Pizarra", token: "--muted-foreground", clase: "bg-muted-foreground", uso: "Texto secundario" },
  { nombre: "Oro", token: "--oro", clase: "bg-oro", uso: "Ganadores y destacados" },
  { nombre: "Tinte oro", token: "--oro-suave", clase: "bg-oro-suave", uso: "Fondos de destacados" },
  { nombre: "Éxito", token: "--exito", clase: "bg-exito", uso: "Confirmaciones" },
  { nombre: "Advertencia", token: "--advertencia", clase: "bg-advertencia", uso: "Empates, avisos" },
  { nombre: "Error", token: "--destructive", clase: "bg-destructive", uso: "Errores y acciones destructivas" },
];

const ESCALA = [
  ["text-6xl", "60 · Display"],
  ["text-4xl", "44 · Título de página"],
  ["text-3xl", "32 · Título de sección"],
  ["text-2xl", "24 · Subtítulo"],
  ["text-xl", "20 · Destacado"],
  ["text-base", "16 · Cuerpo"],
  ["text-sm", "14 · Secundario"],
  ["text-xs", "12 · Etiquetas"],
] as const;

function Bloque({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
      <div>
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function EstiloPage() {
  await exigirAdmin();
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        antetitulo="Sistema de diseño"
        titulo="Guía de estilo"
        descripcion="Referencia interna para mantener la consistencia. Todos los valores salen de los tokens de src/app/globals.css."
      />

      <Bloque titulo="Logotipo" descripcion="Wordmark en Fraunces con «Identidad» en itálica esmeralda. El símbolo es una «i» geométrica con punto dorado (también se lee como una persona).">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex min-h-40 items-center justify-center rounded-xl border bg-background p-8">
            <Logotipo tamano="lg" />
          </div>
          <div className="tema-oscuro relative flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-background p-8">
            <PatronGeometrico className="text-foreground/10" />
            <Logotipo tamano="lg" className="relative" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          {(["size-16", "size-10", "size-8", "size-5"] as const).map((t) => (
            <Simbolo key={t} className={t} />
          ))}
          <span className="text-sm text-muted-foreground">Símbolo (también es el favicon).</span>
        </div>
      </Bloque>

      <Bloque titulo="Paleta" descripcion="Tema claro. El tema oscuro (modo reunión) redefine los mismos tokens con la clase .tema-oscuro.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PALETA.map((c) => (
            <div key={c.nombre} className="overflow-hidden rounded-xl border">
              <div className={cn("h-16 border-b", c.clase)} />
              <div className="p-3">
                <p className="text-sm font-semibold">{c.nombre}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.token}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.uso}</p>
              </div>
            </div>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Tipografía" descripcion="Títulos en Fraunces (500–700, tracking negativo en tamaños grandes). Texto, botones y formularios en Manrope. Números con cifras tabulares (clase cifras).">
        <div className="space-y-3">
          {ESCALA.map(([clase, etiqueta]) => (
            <div key={clase} className="flex items-baseline gap-4 border-b border-border pb-3 last:border-0">
              <span className="w-40 shrink-0 text-xs text-muted-foreground">{etiqueta}</span>
              <span className={cn("truncate", clase, clase.match(/6xl|4xl|3xl|2xl/) ? "font-heading font-semibold" : "")}>Concurso Identidad</span>
            </div>
          ))}
          <p className="font-heading text-4xl font-semibold cifras">001 · 4.77 · 11 de 11</p>
        </div>
      </Bloque>

      <Bloque titulo="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <PlusIcon data-icon="inline-start" /> Primario
          </Button>
          <Button variant="outline">Secundario</Button>
          <Button variant="secondary">Suave</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="tinta">Tinta</Button>
          <Button variant="oro">
            <TrophyIcon data-icon="inline-start" /> Oro
          </Button>
          <Button variant="destructive">Destructivo</Button>
          <Button variant="link">Enlace</Button>
          <Button size="lg">Grande</Button>
          <Button size="sm">Chico</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </Bloque>

      <Bloque titulo="Campos">
        <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="e1">Nombre de la persona</Label>
            <Input id="e1" placeholder="Ana Torres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e2">Con error</Label>
            <Input id="e2" aria-invalid defaultValue="—" />
            <p className="text-sm text-destructive">Este campo es obligatorio.</p>
          </div>
          <div className="relative sm:col-span-2">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar…" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="e3">Significado</Label>
            <Textarea id="e3" rows={3} placeholder="Por qué ese nombre y ese logo." />
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Etiquetas y estados">
        <div className="flex flex-wrap gap-2">
          <Badge>Por defecto</Badge>
          <Badge variant="solido">Abierta</Badge>
          <Badge variant="exito">Activa</Badge>
          <Badge variant="destructive">Descartada</Badge>
          <Badge variant="advertencia">Empate</Badge>
          <Badge variant="oro">1er lugar</Badge>
          <Badge variant="secondary">Cerrada</Badge>
          <Badge variant="outline">Pendiente</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex gap-3.5 rounded-xl border border-advertencia/30 bg-advertencia-fondo px-5 py-4 text-advertencia-foreground">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-advertencia text-white">
              <AlertTriangleIcon className="size-5" />
            </span>
            <p>
              <strong>Empate en el lugar 15.</strong> Decide cuál pasa.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-accent px-5 py-4 text-accent-foreground">
            <CheckIcon className="size-5" /> 15 propuestas pasaron a la Ronda 2.
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Tarjetas y métricas">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Metrica etiqueta="Propuestas activas" cifra={24} tono="primario" pie="2 descartadas" />
            <Metrica etiqueta="Ganadores" cifra={3} tono="oro" pie="Confirmados" />
          </div>
          <TarjetaPropuesta datos={{ folio: "007", nombrePropuesto: "Atlas", significado: "Un nombre que sostiene la estrategia de toda la compañía.", participante: "Ana Torres", area: "Operaciones", ciudad: "Monterrey" }} />
        </div>
        <Embudo
          activas={24}
          rondas={[
            { numero: 1, nombre: "Selección Top 15", estado: "cerrada", top_n: 15, propuestas: 24 },
            { numero: 2, nombre: "Selección Top 5", estado: "abierta", top_n: 5, propuestas: 15 },
            { numero: 3, nombre: "Final Top 3", estado: "pendiente", top_n: 3, propuestas: 0 },
          ]}
        />
      </Bloque>

      <Bloque titulo="Vacío y carga" descripcion="Estados vacíos con ilustración propia y esqueletos en lugar de spinners.">
        <div className="grid gap-5 md:grid-cols-2">
          <EstadoVacio titulo="Aún no hay propuestas">Cuando captures la primera propuesta aparecerá aquí.</EstadoVacio>
          <div className="space-y-3 rounded-2xl border p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Forma, espacio y movimiento">
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>Radios: 10 px controles (rounded-lg) · 16 px tarjetas (rounded-xl) · 24 px paneles (rounded-2xl).</li>
          <li>Espaciado en múltiplos de 4/8; secciones separadas por 32–40 px.</li>
          <li>Sombras suaves en capas: shadow-xs, sm, md, lg (color base tinta).</li>
          <li>Transiciones de 150–250 ms; aparición escalonada con la utilidad «aparecer» y --i.</li>
          <li>Respeta prefers-reduced-motion (sin animaciones).</li>
          <li>Iconos lucide-react a 16–20 px, mismo trazo.</li>
        </ul>
      </Bloque>
    </div>
  );
}
