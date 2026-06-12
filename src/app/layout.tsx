import type { Metadata } from "next";
import { Bebas_Neue, DM_Mono, Cormorant_Garamond, Spectral } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/SolanaWalletProvider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import GlobalInteractions from "@/components/GlobalInteractions";
import PageEffects from "@/components/PageEffects";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});
const dmMono = DM_Mono({
  weight: ["300", "400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});
const cormorant = Cormorant_Garamond({
  weight: ["300", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
});
const spectral = Spectral({
  weight: "300",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-spectral",
});

export const metadata: Metadata = {
  title: {
    default: "Lacus — Credit markets with luminous depth.",
    template: "%s | Lacus",
  },
  description:
    "Lacus is a Solana-native protocol for tokenizing, trading, and settling fixed-income instruments. A deep, continuous market for on-chain credit — rendered clear.",
  keywords: [
    "RWA",
    "tokenized bonds",
    "DeFi",
    "real world assets",
    "Solana",
    "bond protocol",
    "on-chain credit",
    "structured credit",
    "fixed income",
    "portfolio construction",
  ],
  authors: [{ name: "Lacus" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Lacus",
    title: "Lacus",
    description:
      "Transparent credit infrastructure for tokenized bonds, portfolio construction, and auditable structured products.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacus",
    description:
      "Transparent credit infrastructure for tokenized bonds, portfolio construction, and auditable structured products.",
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
      className={`${bebas.variable} ${dmMono.variable} ${cormorant.variable} ${spectral.variable}`}
    >
      <body>
        <SolanaWalletProvider>
          <GlobalInteractions />
          <PageEffects />
          <Navbar />
          <main className="flex-1">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <Footer />
          <Toaster theme="dark" richColors position="top-right" />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
