import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Instrument Sans carries the interface; Plex Mono is reserved for labels,
// column headers and figures, where fixed-width digits keep money columns
// aligned down the page.
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orbit CRM",
  description:
    "A multi-tenant CRM workspace where every organization sees only its own accounts — Next.js, NestJS and PostgreSQL.",
  // Chrome offers to translate an English page for a visitor whose browser is
  // set to another language, and its translator swaps text nodes for <font>
  // wrappers of its own. The next React update walks a tree it no longer
  // recognises and throws insertBefore, which reaches the visitor as a blank
  // "Application error" the moment they interact with the dashboard.
  other: { google: "notranslate" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" translate="no" className={`${sans.variable} ${mono.variable} notranslate`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
