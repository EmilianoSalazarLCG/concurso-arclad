import { Votacion } from "@/components/votar/votacion";
import { obtenerVotantes } from "@/config/votantes";
import { estadoVotacion } from "@/lib/datos/votacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votación · Concurso Identidad", robots: { index: false, follow: false } };

/** Página PÚBLICA de votación de los gerentes (sin login, sin enlaces al portal de admin). */
export default async function VotarPage() {
  const [votantes, estado] = await Promise.all([obtenerVotantes(), estadoVotacion()]);
  return <Votacion votantes={votantes.map(({ id, nombre }) => ({ id, nombre }))} estadoInicial={estado} />;
}
