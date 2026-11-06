import { redirect } from "next/navigation";
import { obtenerAdminActual } from "@/lib/datos/auth";
import { FormularioLogin } from "./formulario-login";

export const dynamic = "force-dynamic";

export const metadata = { title: "Iniciar sesión · Concurso identidad" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await obtenerAdminActual()) redirect("/admin");

  const { motivo, siguiente } = await searchParams;
  const avisoInicial =
    motivo === "sin-acceso"
      ? "No tienes acceso al panel. Si crees que es un error, contacta a People & Culture."
      : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">People &amp; Culture</p>
          <h1 className="mt-2 text-3xl font-semibold">Concurso identidad</h1>
          <p className="mt-2 text-sm text-muted-foreground">Panel de administración</p>
        </div>
        <FormularioLogin
          avisoInicial={avisoInicial}
          siguiente={typeof siguiente === "string" ? siguiente : undefined}
        />
      </div>
    </main>
  );
}
