import QRCode from "qrcode";
import { ModoReunion } from "@/components/reunion/modo-reunion";
import { exigirAdmin } from "@/lib/datos/auth";
import { propuestasReunion, rondasReunion } from "@/lib/datos/reunion";
import { linkVotacion } from "@/lib/link-votacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modo reunión · Concurso identidad" };

export default async function ReunionPage() {
  await exigirAdmin();
  const [propuestas, rondas] = await Promise.all([propuestasReunion("activas"), rondasReunion()]);

  const link = await linkVotacion();
  // El QR apunta al link corto (la raíz redirige a /votar).
  const qrSvg = await QRCode.toString(link.url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <ModoReunion
      propuestasIniciales={propuestas}
      rondas={rondas}
      urlVotar={link.url}
      linkCorto={link.corto}
      qrSvg={qrSvg}
    />
  );
}
