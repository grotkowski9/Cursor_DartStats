import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Panel statystyk darta — import meczów z N01, profil gracza, wykres formy i H2H. Demo profil przed rejestracją.",
  openGraph: {
    title: SITE_NAME,
    description:
      "Importuj mecze z n01 i analizuj swoją grę — średnie, checkout, forma, aktywność.",
    type: "website",
    locale: "pl_PL",
    siteName: SITE_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`dark ${inter.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
