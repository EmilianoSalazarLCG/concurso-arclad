import { headers } from "next/headers";
import QRCode from "qrcode";
import { ModoReunion } from "@/components/reunion/modo-reunion";
import { exigirAdmin } from "@/lib/datos/auth";
import { propuestasReunion, rondasReunion } from "@/lib/datos/reunion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modo reunión · Concurso identidad" };

export default async function ReunionPage() {
  await exigirAdmin();
  const [propuestas, rondas, h] = await Promise.all([propuestasReunion("activas"), rondasReunion(), headers()]);

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const urlVotar = `${protocolo}://${host}/votar`;
  const qrSvg = await QRCode.toString(urlVotar, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <ModoReunion
      propuestasIniciales={propuestas}
      rondas={rondas}
      urlVotar={urlVotar}
      linkCorto={`${host}/votar`}
      qrSvg={qrSvg}
    />
  );
}
