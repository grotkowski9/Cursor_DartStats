import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dart Profile Tracker",
  description:
    "Prywatny panel statystyk darta — importuj mecze z n01 i analizuj swoją grę.",
  openGraph: {
    title: "Dart Profile Tracker",
    description:
      "Prywatny panel statystyk darta — importuj mecze z n01 i analizuj swoją grę.",
    type: "website",
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
