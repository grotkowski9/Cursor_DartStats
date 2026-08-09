import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";
import { siteDocumentTitle, SITE_OG_TITLE } from "@/lib/page-metadata";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: siteDocumentTitle(),
  description:
    "Twój profil gracza darta: średnie, checkouty i H2H z meczów N01. Chcesz wiedzieć o której godzinie masz najlepszą formę? Wiele statystyk pod ręką. Bez excela.",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: SITE_OG_TITLE,
    description:
      "Twój profil gracza darta: średnie, checkouty i H2H z meczów N01. Chcesz wiedzieć o której godzinie masz najlepszą formę? Wiele statystyk pod ręką. Bez excela.",
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
      <body className="min-h-screen antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
