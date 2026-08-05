import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

/** Unset in dev and in any environment that hasn't been given an ID — GA is then simply not loaded. */
const gaId = process.env.NEXT_PUBLIC_GA_ID;

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ali Majed",
  description:
    "Ali Majed builds software end-to-end: agentic AI systems that coordinate multiple models, and frontend-first web development across the whole lifecycle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="antialiased">{children}</body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
