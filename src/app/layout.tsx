import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { SITE } from "@/content/site";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: SITE.name, template: `%s | ${SITE.shortName}` },
  description: SITE.description,
  appleWebApp: { capable: true, title: SITE.brand, statusBarStyle: "default" },
  openGraph: { title: SITE.name, description: SITE.description, locale: "it_IT", type: "website" },
  // Verifica della proprietà del sito in Google Search Console (richiesta per la verifica dell'app Google)
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#f5f3ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh antialiased">
        <PwaRegister />{children}</body>
    </html>
  );
}
