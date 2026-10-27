import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Newsreader } from "next/font/google";
import { SITE } from "@/content/site";
import "./globals.css";

const grotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: SITE.name, template: `%s | ${SITE.shortName}` },
  description: SITE.description,
  openGraph: { title: SITE.name, description: SITE.description, locale: "it_IT", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#f3f5f7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${grotesk.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
