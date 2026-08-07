import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AppShell } from "@/components/AppShell";
import { rootMetadata } from "@/lib/seo";
import { DEFAULT_THEME, LIGHT_THEME_COLOR } from "@/lib/theme";
import "./globals.css";

/** Unset in dev and in any environment that hasn't been given an ID — GA is then simply not loaded. */
const gaId = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Self-hosted rather than `next/font/google`: that variant fetches the font from
 * Google at build time, so a restricted CI runner or a Google Fonts outage fails
 * the build before app code is even compiled. `archivo-latin-variable.woff2` is
 * the latin subset of the Archivo variable font (the exact file the Google Fonts
 * CSS served for `subsets: ["latin"]`), checked in at ~35 KB.
 */
const archivo = localFont({
  src: "./fonts/archivo-latin-variable.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  themeColor: LIGHT_THEME_COLOR,
  colorScheme: DEFAULT_THEME,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={archivo.variable} data-theme={DEFAULT_THEME}>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
