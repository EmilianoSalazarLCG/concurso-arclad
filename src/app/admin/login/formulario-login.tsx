"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesion, type EstadoLogin } from "../acciones-sesion";

export function FormularioLogin({ avisoInicial, siguiente }: { avisoInicial?: string; siguiente?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(iniciarSesion, {
    error: avisoInicial,
  });

  return (
    <form action={accion} className="space-y-5 rounded-xl border bg-card p-6 shadow-sm" noValidate>
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
          aria-invalid={Boolean(estado.error) || undefined}
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {estado.error}
        </p>
      )}

      <Button type="submit" className="h-10 w-full" disabled={enviando}>
        {enviando ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
