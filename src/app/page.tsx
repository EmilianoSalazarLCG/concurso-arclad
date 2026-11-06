import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** El link corto (la raíz del sitio) lleva directo a la votación de los gerentes. */
export default function Inicio() {
  redirect("/votar");
}
