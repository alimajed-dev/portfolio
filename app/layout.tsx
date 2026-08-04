import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ali Majed — Portfolio",
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
    </html>
  );
}
