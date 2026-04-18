import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ChainGuard from "@/components/ChainGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Lacus",
    template: "%s | Lacus",
  },
  description:
    "Lacus is transparent credit infrastructure for on-chain capital markets: issue tokenized bonds, build fixed-income portfolios, and structure auditable credit products for a Solana-native future.",
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
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased tracking-tight`}>
        <Web3Provider>
          <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400/90">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              This demo environment uses test-only assets while <strong>Lacus migrates to Solana Devnet</strong>.
            </span>
          </div>
          <ChainGuard />
          <Navbar />
          <main className="flex-1">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <Footer />
          <Toaster theme="dark" richColors position="top-right" />
        </Web3Provider>
      </body>
    </html>
  );
}
