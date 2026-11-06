"use client";

import { useActionState } from "react";
import { AlertCircleIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesion, type EstadoLogin } from "../acciones-sesion";

export function FormularioLogin({ avisoInicial, siguiente }: { avisoInicial?: string; siguiente?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(iniciarSesion, {
    error: avisoInicial,
  });

  return (
    <form action={accion} className="space-y-5" noValidate>
      <input type="hidden" name="siguiente" value={siguiente ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="correo">Correo</Label>
        <Input
          id="correo"
          name="correo"
          type="email"
          autoComplete="username"
          defaultValue={estado.correo}
          required
          autoFocus
          className="h-11"
          aria-invalid={Boolean(estado.error) || undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contrasena">Contraseña</Label>
        <Input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
          aria-invalid={Boolean(estado.error) || undefined}
        />
      </div>

      {estado.error && (
        <p role="alert" className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive-fondo px-3 py-2.5 text-sm text-destructive">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {estado.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? (
          <>
            <Loader2Icon data-icon="inline-start" className="animate-spin" /> Entrando…
          </>
        ) : (
          <>
            Iniciar sesión <ArrowRightIcon data-icon="inline-end" />
          </>
        )}
      </Button>
    </form>
  );
}
