import { Votacion } from "@/components/votar/votacion";
import { etiquetaVotantes, obtenerVotantes } from "@/config/votantes";
import { estadoVotacion } from "@/lib/datos/votacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votación · Concurso Identidad", robots: { index: false, follow: false } };

/** Página PÚBLICA de votación (sin login, sin enlaces al portal de admin). Votan los de la ronda abierta. */
export default async function VotarPage() {
  const estado = await estadoVotacion();
  const numeroRonda = estado.tipo === "abierta" ? estado.ronda.numero : null;
  const votantes = await obtenerVotantes(numeroRonda);
  return (
    <Votacion
      votantes={votantes.map(({ id, nombre }) => ({ id, nombre }))}
      estadoInicial={estado}
      etiqueta={etiquetaVotantes(numeroRonda) === "gerentes" ? "Votación de gerentes" : "Votación del personal"}
    />
  );
}
