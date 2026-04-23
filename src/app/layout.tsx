import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/SolanaWalletProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ChainGuard from "@/components/ChainGuard";
import GlobalInteractions from "@/components/GlobalInteractions";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} min-h-screen antialiased tracking-tight`}>
        {/* Global ambient layer — visible on every page */}
        <div id="cursor-orb" />
        <div className="fixed inset-0 z-[-3] grain" />
        <div className="fixed top-[-25vh] left-[-10vw] w-[90vw] h-[90vh] z-[-2] pointer-events-none">
          <div className="drift w-full h-full aura-top" />
        </div>
        <div className="fixed top-[55vh] right-[-20vw] w-[80vw] h-[80vh] z-[-2] pointer-events-none">
          <div className="drift w-full h-full aura-mid" style={{ animationDelay: "-14s" }} />
        </div>

        <SolanaWalletProvider>
          <GlobalInteractions />
          <ChainGuard />
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
