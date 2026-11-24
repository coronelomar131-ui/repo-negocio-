import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans } from "next/font/google";
import { SITIO } from "@/lib/sitio";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

const titulo = "Taller Digital by Omar · Sistemas a la medida para tu negocio";
const descripcion = "Hago sistemas para negocios mexicanos: ventas, inventario, notas, cocina, caja y cobranza, conectados a Mercado Libre y WhatsApp. Diseñados a partir de cómo ya trabajas.";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO.url),
  title: titulo,
  description: descripcion,
  alternates: { canonical: "/" },
  openGraph: { title: titulo, description: descripcion, url: "/", siteName: "Taller Digital by Omar", locale: "es_MX", type: "website" },
  twitter: { card: "summary_large_image", title: titulo, description: descripcion },
};

export const viewport: Viewport = { themeColor: "#f3eee6" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${archivo.variable} ${instrument.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
