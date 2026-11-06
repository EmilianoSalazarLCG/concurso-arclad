import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const titulos = Fraunces({ variable: "--font-titulos", subsets: ["latin"], axes: ["opsz", "SOFT"], display: "swap" });
const texto = Manrope({ variable: "--font-texto", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Concurso Identidad",
  description: "Concurso interno de naming y logo",
  applicationName: "Concurso Identidad",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${titulos.variable} ${texto.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" closeButton />
      </body>
    </html>
  );
}
