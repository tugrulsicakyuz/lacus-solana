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
    default: "Sparrow",
    template: "%s | Sparrow",
  },
  description:
    "Issue, trade, and manage tokenized real-world asset bonds on-chain. Sparrow Protocol brings institutional-grade bond infrastructure to Web3 on Base.",
  keywords: [
    "RWA",
    "tokenized bonds",
    "DeFi",
    "real world assets",
    "Base blockchain",
    "bond protocol",
    "on-chain bonds",
    "yield",
    "institutional DeFi",
  ],
  authors: [{ name: "Sparrow Protocol" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sparrow-protocol.vercel.app",
    siteName: "Sparrow",
    title: "Sparrow",
    description:
      "Issue, trade, and manage tokenized real-world asset bonds on-chain. Institutional-grade infrastructure on Base.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sparrow",
    description:
      "Issue, trade, and manage tokenized real-world asset bonds on-chain. Institutional-grade infrastructure on Base.",
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
              This application runs on <strong>Base Sepolia testnet</strong>. Do not use real funds or assets.
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
