import { redirect } from "next/navigation";
import { Logotipo } from "@/components/marca/logotipo";
import { PatronGeometrico } from "@/components/marca/patron";
import { obtenerAdminActual } from "@/lib/datos/auth";
import { FormularioLogin } from "./formulario-login";

export const dynamic = "force-dynamic";

export const metadata = { title: "Iniciar sesión · Concurso Identidad" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await obtenerAdminActual()) redirect("/admin");

  const { motivo, siguiente } = await searchParams;
  const avisoInicial =
    motivo === "sin-acceso"
      ? "No tienes acceso al panel. Si crees que es un error, contacta a People & Culture."
      : undefined;

  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca (tinta) */}
      <section className="tema-oscuro relative isolate flex flex-col justify-between overflow-hidden bg-background px-6 py-8 text-foreground sm:px-10 lg:min-h-dvh lg:px-14 lg:py-12">
        <PatronGeometrico className="-z-10 text-foreground/[0.09]" />
        <div className="absolute -right-24 -bottom-24 -z-10 size-96 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <Logotipo tamano="md" />
        <div className="mt-10 hidden max-w-lg lg:block">
          <p className="text-xs font-semibold tracking-[0.22em] text-oro uppercase">People &amp; Culture</p>
          <h1 className="mt-4 text-5xl leading-[1.05] font-semibold">
            El nombre que nos va a <em className="font-medium text-primary">representar</em> empieza aquí.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Captura las propuestas, guía la votación de los gerentes y revela a los ganadores.
          </p>
        </div>
        <p className="mt-10 hidden text-xs text-muted-foreground lg:block">Panel de administración · acceso restringido</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-sm aparecer">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase lg:hidden">People &amp; Culture</p>
          <h2 className="mt-1 text-3xl font-semibold">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-muted-foreground">Usa tu correo y contraseña de administrador.</p>
          <div className="mt-8">
            <FormularioLogin avisoInicial={avisoInicial} siguiente={typeof siguiente === "string" ? siguiente : undefined} />
          </div>
        </div>
      </section>
    </main>
  );
}
