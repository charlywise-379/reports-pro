import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import "./fonts.css";
import MetaPixel from "./MetaPixel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Newake (títulos, vía fonts.css) + DM Sans (copy) — usadas por la
// landing principal (antes /landing-2, ahora /).
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Omni Reports · Inteligencia Competitiva con IA",
  description: "Reportes de inteligencia competitiva automatizados con IA para PYMES en México y LATAM.",
  // Verificación del dominio en Meta Business (<meta name="facebook-domain-verification">).
  other: { "facebook-domain-verification": "a1979u258hgyrkjxfcnb1c0er5uwem" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
