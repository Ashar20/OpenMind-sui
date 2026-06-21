import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";
import "./globals.css";

const instrument = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});
const plexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-sans",
});

export const metadata: Metadata = {
  metadataBase: process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL("http://localhost:3000"),
  title: "openmind — AI carry vault on DeepBook Predict",
  description:
    "AI-driven adaptive carry vault on Sui. Hedge budget set by reasoning, stored on Walrus, anchored on-chain before settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${instrument.variable} ${plexMono.variable} ${plexSans.variable} grain scanlines min-h-screen antialiased`}
      >
        <Providers>
          <SiteHeader />
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
