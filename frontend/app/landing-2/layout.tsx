import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./fonts.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Omni Reports · Inteligencia Competitiva con IA",
  description: "Reportes de inteligencia competitiva automatizados con IA para PYMES en México y LATAM.",
};

export default function Landing2Layout({ children }: { children: React.ReactNode }) {
  return <div className={dmSans.variable}>{children}</div>;
}
