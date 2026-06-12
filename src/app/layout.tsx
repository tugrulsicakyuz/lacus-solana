import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Spectral } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/SolanaWalletProvider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import GlobalInteractions from "@/components/GlobalInteractions";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-inter",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});
const spectral = Spectral({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-spectral",
});

export const metadata: Metadata = {
  title: {
    default: "Lacus · Peer-to-peer credit, executed on Solana",
    template: "%s | Lacus",
  },
  description:
    "Real borrowers, real contracts, executed on Solana. Lacus never holds your funds.",
  keywords: [
    "tokenized bonds",
    "DeFi",
    "Solana",
    "bond protocol",
    "on-chain credit",
    "fixed income",
    "peer-to-peer lending",
    "private credit",
  ],
  authors: [{ name: "Lacus" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Lacus",
    title: "Lacus",
    description:
      "Real borrowers, real contracts, executed on Solana. Lacus never holds your funds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacus",
    description:
      "Real borrowers, real contracts, executed on Solana. Lacus never holds your funds.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable} ${spectral.variable}`}
    >
      <body>
        <SolanaWalletProvider>
          <GlobalInteractions />
          <Navbar />
          <main className="flex-1">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <Footer />
          <Toaster theme="light" richColors position="top-right" />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
